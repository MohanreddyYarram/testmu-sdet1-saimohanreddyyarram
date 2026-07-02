import type { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { explainFailure, FailureExplanation } from '../llm/failureExplainer';
 
dotenv.config();
 
interface ReportEntry {
  test: string;
  file: string;
  status: string;
  aiExplanation: FailureExplanation;
}
 
export default class AIFailureReporter implements Reporter {
  private entries: ReportEntry[] = [];
  private pending: Promise<void>[] = [];
 
  onTestEnd(test: TestCase, result: TestResult): void {
    if (result.status !== 'failed' && result.status !== 'timedOut') return;
 
    const errorMessage = result.errors.map((e) => e.message || e.stack || '').join('\n') || 'Unknown error';
    const kind: 'ui' | 'api' = test.location.file.includes('api.spec') ? 'api' : 'ui';
 
    const job = explainFailure({
      testTitle: test.titlePath().slice(1).join(' > '),
      filePath: path.relative(process.cwd(), test.location.file),
      errorMessage,
      kind,
    })
      .then((aiExplanation) => {
        this.entries.push({
          test: test.titlePath().slice(1).join(' > '),
          file: path.relative(process.cwd(), test.location.file),
          status: result.status,
          aiExplanation,
        });
      })
      .catch((err) => {
        this.entries.push({
          test: test.titlePath().slice(1).join(' > '),
          file: path.relative(process.cwd(), test.location.file),
          status: result.status,
          aiExplanation: {
            summary: 'AI explanation call failed.',
            likelyCause: String(err),
            suggestedFix: 'Check ANTHROPIC_API_KEY and network access.',
            confidence: 'low',
            raw: '',
          },
        });
      });
 
    this.pending.push(job);
  }
 
  async onEnd(_result: FullResult): Promise<void> {
    await Promise.all(this.pending);
 
    const outDir = path.join(process.cwd(), 'ai-failure-reports');
    fs.mkdirSync(outDir, { recursive: true });
 
    fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(this.entries, null, 2));
 
    const md = [
      '# AI Failure Explanations',
      '',
      this.entries.length === 0
        ? 'No failures this run.'
        : `${this.entries.length} failing test(s) analyzed by Claude.`,
      '',
      ...this.entries.flatMap((e) => [
        `## ${e.test}`,
        `**File:** \`${e.file}\`  `,
        `**Status:** ${e.status}  `,
        `**Confidence:** ${e.aiExplanation.confidence}`,
        '',
        `**Summary:** ${e.aiExplanation.summary}`,
        '',
        `**Likely cause:** ${e.aiExplanation.likelyCause}`,
        '',
        `**Suggested fix:** ${e.aiExplanation.suggestedFix}`,
        '',
        '---',
        '',
      ]),
    ].join('\n');
 
    fs.writeFileSync(path.join(outDir, 'report.md'), md);
  }
}
 