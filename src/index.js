import * as core from "@actions/core";
import { run } from "./oss-pr-monitor";

run().catch((err) => {
  core.setFailed(err.message);
});
