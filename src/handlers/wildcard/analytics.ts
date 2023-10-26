import { upsertUser } from "../../adapters/supabase";
import { getBotConfig, getLogger } from "../../bindings";
import { listIssuesForRepo, getUser, calculateWeight } from "../../helpers";
import { Issue, IssueType, User, UserProfile } from "../../types";

/**
 * Checks the issue whether it's a bounty for hunters or an issue for not
 * @param issue - The issue object
 * @returns If bounty - true, If issue - false
 */
export const bountyInfo = (
  issue: Issue
): {
  isBounty: boolean;
  timelabel: string | undefined;
  priorityLabel: string | undefined;
  priceLabel: string | undefined;
} => {
  const config = getBotConfig();
  const labels = issue.labels;

  const timeLabels = config.price.timeLabels.filter((item) => labels.map((i) => i.name).includes(item.name));
  const priorityLabels = config.price.priorityLabels.filter((item) => labels.map((i) => i.name).includes(item.name));

  const isBounty = timeLabels.length > 0 && priorityLabels.length > 0;

  const minTimeLabel = timeLabels.length > 0 ? timeLabels.reduce((a, b) => (calculateWeight(a) < calculateWeight(b) ? a : b)).name : undefined;
  const minPriorityLabel = priorityLabels.length > 0 ? priorityLabels.reduce((a, b) => (calculateWeight(a) < calculateWeight(b) ? a : b)).name : undefined;

  const priceLabel = labels.find((label) => label.name.includes("Price"))?.name;

  return {
    isBounty,
    timelabel: minTimeLabel,
    priorityLabel: minPriorityLabel,
    priceLabel,
  };
};

/**
 * Collects all the analytics information by scanning the issues opened | closed
 */
export const collectAnalytics = async (): Promise<void> => {
  const logger = getLogger();
  const {
    mode: { disableAnalytics },
  } = getBotConfig();
  if (disableAnalytics) {
    logger.info(`Skipping to collect analytics, reason: mode=${disableAnalytics}`);
    return;
  }
  logger.info("Collecting analytics information...");

  let fetchDone = false;
  const perPage = 30;
  let curPage = 1;
  while (!fetchDone) {
    const issues = await listIssuesForRepo(IssueType.ALL, perPage, curPage);

    // need to skip checking the closed issues already stored in the db and filter them by doing a sanitation checks.
    // sanitation checks would be basically checking labels of the issue
    // whether the issue has both `priority` label and `timeline` label
    const bounties = issues.filter((issue) => bountyInfo(issue as Issue).isBounty);

    // collect assignees from both type of issues (opened/closed)
    const assignees = bounties.filter((bounty) => bounty.assignee).map((bounty) => bounty.assignee as User);

    // remove duplication by assignee
    const tmp = assignees.map((i) => i.login);
    const assigneesToUpsert = assignees.filter((assignee, pos) => tmp.indexOf(assignee.login) == pos);
    const userProfilesToUpsert = await Promise.all(
      assigneesToUpsert.map(async (assignee) => {
        const res = await getUser(assignee.login);
        return res as UserProfile;
      })
    );

    logger.info(
      `Upserting users: ${userProfilesToUpsert
        .filter((i) => i.login)
        .map((i) => i.login)
        .toString()}`
    );

    await Promise.all(userProfilesToUpsert.map((i) => upsertUser(i)));

    if (issues.length < perPage) fetchDone = true;
    else curPage++;
  }
  logger.info("Collecting analytics finished...");
};
