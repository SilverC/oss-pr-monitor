
import * as github from "@actions/github";
import * as core from "@actions/core";
import { run } from "../src/oss-pr-monitor";
import * as errors from "../src/errors";

jest.mock('@actions/github');

describe("Close Pull Request", () => {
  let mockOctokit;
  let inputs;

  beforeEach(() => {
    inputs = { github_token: "token" };
    ((core) => {
      core.getInput = jest.fn().mockImplementation((name) => {
        return inputs[name];
      });
    })(core);


    mockOctokit = {
      rest: {
        issues: {
          createComment: jest.fn().mockResolvedValue(),
        },
        pulls: {
          update: jest.fn().mockResolvedValue(),
        },
      },
    };
    github.getOctokit.mockReturnValue(mockOctokit);
    github.context = {
      eventName: 'pull_request_target',
      ref: 'refs/pull/232/merge',
      workflow: 'OSS PR Monitor',
      action: 'csilvergithub-action-1',
      actor: 'csilver',
      payload: {
        action: 'closed',
        number: '1',
        pull_request: {
          number: 1,
          title: 'test',
          user: {
            login: 'csilver',
          },
          author_association: "CONTRIBUTOR"
        },
        repository: {
          name: 'test',
          owner: {
            login: 'csilver',
          },
        },
      },
      repo: {
        owner: 'csilver',
        repo: 'test',
      },
      issue: {
        owner: 'csilver',
        repo: 'test',
        number: 1,
      },
      sha: ''
    }
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should close a pull request", async () => {
    await run();

    expect(mockOctokit.rest.pulls.update).toHaveBeenCalledWith({
      ...github.context.repo,
      pull_number: github.context.issue.number,
      state: "closed",
    });
  });

  describe("when event type is not pull_request_target", () => {
    beforeEach(() => {
      github.context.eventName = "push";
    });

    it("should throw 'ignore event' error", async () => {
      await expect(run()).rejects.toEqual(errors.ignoreEvent);
    });
  });

  describe("when user is a member of org", () => {
    beforeEach(() => {
      github.context.payload.pull_request.author_association = "MEMBER";
    });

    it("should throw 'ignore event' error", async () => {
      await expect(run()).rejects.toEqual(errors.ignoreEvent);
    });
  });

  describe("when user is a owner of org", () => {
    beforeEach(() => {
      github.context.payload.pull_request.author_association = "OWNER";
    });

    it("should throw 'ignore event' error", async () => {
      await expect(run()).rejects.toEqual(errors.ignoreEvent);
    });
  });

  describe("when GITHUB_TOKEN env variable is set", () => {
    let warnSpy;

    beforeEach(() => {
      process.env.GITHUB_TOKEN = "token";
      warnSpy = jest.spyOn(core, "warning");
    });

    afterEach(() => {
      delete process.env.GITHUB_TOKEN;
    });

    it("should throw 'no token' error", async () => {
      await run();

      expect(warnSpy).toHaveBeenCalled();
      expect(mockOctokit.rest.pulls.update).toHaveBeenCalledWith({
        ...github.context.repo,
        pull_number: github.context.issue.number,
        state: "closed",
      });
    });
  });

  describe("when pull_request is undefined", () => {
    let warnSpy;

    beforeEach(() => {
      github.context.payload.pull_request = undefined
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
      expect(mockOctokit.rest.issues.createComment).toHaveBeenCalledWith({
        ...github.context.repo,
        issue_number: github.context.issue.number,
        body: comment,
      });
    });

    it("should update a pull request", async () => {
      await run();

      expect(mockOctokit.rest.pulls.update).toHaveBeenCalledWith({
        ...github.context.repo,
        pull_number: github.context.issue.number,
        state: "closed",
      });
    });
  });
  
});
