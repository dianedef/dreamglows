import test from 'node:test'; import assert from 'node:assert/strict'; import { readFile } from 'node:fs/promises';
const source=await readFile(new URL('../src/views/GoalsView.vue',import.meta.url),'utf8');
test('GoalsView renders shared canonical Journey tree and detail',()=>{assert.match(source,/PathJourneyTree/);assert.match(source,/PathDetailPanel/);assert.match(source,/pathStore\.journeyProjection/);assert.match(source,/flattenJourney/);assert.match(source,/pathStore\.select\(row\.id\)/)});
test('GoalsView has no legacy GoalTree or entity-store dependency',()=>{assert.doesNotMatch(source,/GoalTree\.vue|useGoalsStore|useTasksStore|goalsStore|tasksStore/)});
test('GoalsView retains canonical modal entry points without legacy mutations',()=>{assert.match(source,/new GoalModal\(props\.app,uiContext/);assert.match(source,/new TaskModal\(props\.app,uiContext/);assert.doesNotMatch(source,/\.(addGoal|updateGoal|deleteGoal|addTask|updateTask|deleteTask)\(/)});
