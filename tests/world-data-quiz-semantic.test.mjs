import assert from 'node:assert/strict';
import { DATA_LANGUAGES } from '../assets/js/data-routes.mjs';
import { gameText } from '../assets/js/games/games-i18n.mjs';
import { auditWorldDataQuiz } from '../scripts/audit-world-data-quiz.mjs';

for(const language of Object.keys(DATA_LANGUAGES)){
  const text=gameText(language),increase=text.increase('Indicator',2001,2021),decrease=text.decrease('Indicator',2001,2021);
  assert.ok(increase&&decrease,`${language}: change templates`);assert.notEqual(increase,decrease,`${language}: increase/decrease must differ`);assert.ok(increase.includes('2001')&&increase.includes('2021'));assert.ok(decrease.includes('2001')&&decrease.includes('2021'));
}
const report=await auditWorldDataQuiz();
assert.equal(report.challenges,380);assert.equal(report.questions,1900);assert.equal(report.validQuestions,1900);
for(const key of ['invalidSigns','wrongAnswers','rawTies','formattedTies','yearMismatches','aggregates','nullValues','valueMismatches','invalidTypes','sourceMismatches','textMismatches'])assert.equal(report[key],0,key);
for(const count of Object.values(report.typeCounts))assert.ok(count>0);
console.log(`world-data-quiz-semantic: ${report.validQuestions}/${report.questions} valid, signs/answers/ties/years/aggregates/nulls/sources/i18n OK`);
