import * as github from '@actions/github'
import { context } from '@actions/github'
import * as core from "@actions/core";
import { run } from "../src/oss-pr-monitor";
import * as errors from "../src/errors";

jest.mock("@actions/github");

describe("Close Pull Request", () => {
  let update;
  let create;
  let inputs;

  beforeEach(() => {
    inputs = { github_token: "token" };
    ((core) => {
      core.getInput = jest.fn().mockImplementation((name) => {
        return inputs[name];
      });
    })(core);

    update = jest.fn().mockResolvedValue();
    create= jest.fn().mockResolvedValue();

    github.context = {
      eventName: 'pull_request_target',
      repo: {
        owner: "owner",
        repo: "repo",
      },
      issue: {
        owner: "owner",
        repo: "repo",
        number: 1,
      },
      payload: {
        action: 'closed',
        number: '1',
        pull_request: {
          number: 1,
          title: 'test'
        },
        issue: {
          owner: "owner",
          repo: "repo",
          number: 1,
        }
      }
    }

    const octokit = {
      rest: {
        issues: {
          create,
        },
        pulls: {
          update,
        },
      }
    };

    github.getOctokit.mockImplementation(() => octokit);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should update a pull request", async () => {
    await run();

    expect(update).toHaveBeenCalledWith({
      ...context.repo,
      pull_number: context.issue.number,
      state: "closed",
    });
  });

  describe("when event type is not pull_request_target", () => {
    beforeEach(() => {
      context.eventName = "push";
    });

    it("should throw 'ignore event' error", async () => {
      await expect(run()).rejects.toEqual(errors.ignoreEvent);
    });
  });

  describe("when 'comment' input is passed", () => {
    const comment = "comment";

    beforeEach(() => {
      inputs["comment"] = comment;
    });

    it("should create a comment", async () => {
      await run();
      expect(create).toHaveBeenCalledWith({
        ...context.repo,
        issue_number: context.issue.number,
        body: comment,
      });
    });

    it("should update a pull request", async () => {
      await run();

      expect(update).toHaveBeenCalledWith({
        ...context.repo,
        pull_number: context.issue.number,
        state: "closed",
      });
    });
  });
});
