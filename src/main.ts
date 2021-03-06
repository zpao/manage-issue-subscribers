import * as core from '@actions/core';
import * as github from '@actions/github';
import * as Octokit from '@octokit/rest';

type BasicUserInfo = { login: string; id: number };

const LABEL_TO_USERS_MAP: { [key: string]: string[] } = {
  bug: ['@zpao-test'],
  duplicate: ['@zpao'],
  documentation: ['@zpao', '@zpao-test']
};

// Not ideal but we can't get this via API.
const BOT_ID = 41898282;

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

    const comments: Octokit.IssuesListCommentsResponseItem[] = await client.paginate(
      client.issues.listComments.endpoint.merge({
        owner: issue.owner,
        repo: issue.repo,
        number: issue.number,
        per_page: 100
      })
    );

    const botComment = comments.find(comment => comment.user.id === BOT_ID);

    const commentBody = `cc ${Array.from(mentionees).join(', ')}`;

    if (botComment === undefined) {
      await client.issues.createComment({
        owner: issue.owner,
        repo: issue.repo,
        issue_number: issue.number,
        body: commentBody
      });
    } else {
      await client.issues.updateComment({
        owner: issue.owner,
        repo: issue.repo,
        comment_id: botComment.id,
        body: commentBody
      });
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

main();
