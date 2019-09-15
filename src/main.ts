import * as core from '@actions/core';
import * as github from '@actions/github';

const LABEL_TO_USERS_MAP: { [key: string]: string[] } = {
  bug: ['@zpao-test'],
  duplicate: ['@zpao'],
  documentation: ['@zpao', '@zpao-test']
};

async function main() {
  console.log(JSON.stringify(github.context, null, 2));
  try {
    const repoToken: string = core.getInput('repo-token', { required: true });
    const issue: { owner: string; repo: string; number: number } =
      github.context.issue;

    const client = new github.GitHub(repoToken);
    // TODO: can we just get the labels from the context?
    const { data: labels } = await client.issues.listLabelsOnIssue({
      owner: issue.owner,
      repo: issue.repo,
      issue_number: issue.number
    });

    let mentionees: Set<string> = new Set();
    labels.forEach(label => {
      const users = LABEL_TO_USERS_MAP[label.name];
      if (users != null) {
        users.forEach(u => mentionees.add(u));
      }
    });

    await client.issues.createComment({
      owner: issue.owner,
      repo: issue.repo,
      issue_number: issue.number,
      body: `cc ${Array.from(mentionees).join(', ')}`
    });
  } catch (error) {
    core.setFailed(error.message);
  }
}

main();
