import * as core from "@actions/core";
import * as github from "@actions/github";
import * as errors from "./errors";

export const run = async () => {
  const context = github.context;
  if (context.eventName !== "pull_request_target") {
    throw errors.ignoreEvent;
  }

  const token = core.getInput('github_token');
  const client = github.getOctokit(token);
  
  if (context.payload.pull_request === undefined) {
    throw errors.ignoreEvent;
  }

  // Ignore organization members and owners. They're allowed to make changes.
  let author_association = context.payload.pull_request.author_association;
  if (author_association === "MEMBER" || author_association === "OWNER") {
    throw errors.ignoreEvent;
  }

  // *Optional*. Post an issue comment just before closing a pull request.
  const body = core.getInput("comment") || "";
  if (body.length > 0) {
    core.info("Creating a comment");
    await client.rest.issues.create({
      ...context.repo,
      issue_number: context.issue.number,
      body,
    });
  }

  core.info("Updating the state of a pull request to closed");
  await client.rest.pulls.update({
    ...context.repo,
    pull_number: context.issue.number,
    state: "closed",
  });

  core.info(`Closed a pull request ${context.issue.number}`);
};
