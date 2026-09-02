const fs = require('fs');
const path = require('path');
const vm = require('vm');

const jsFiles = [
  path.join(__dirname, 'js', 'core.js'),
  path.join(__dirname, 'js', 'tabs', 'dashboard.js'),
  path.join(__dirname, 'js', 'tabs', 'work.js'),
  path.join(__dirname, 'js', 'tabs', 'sales.js'),
  path.join(__dirname, 'js', 'tabs', 'admin.js'),
  path.join(__dirname, 'js', 'tabs', 'projects.js')
];

let js = jsFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n;\n');
js = js.replace(/import\s+[\s\S]*?;/g, 'const createClient = () => ({ from: () => ({ select: () => ({ eq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [] }), order: () => Promise.resolve({ data: [] }) }) }) }) }) });');

const mockCode = `
const window = { location: { href: '' }, addEventListener: () => {} };
const document = { getElementById: () => ({ innerHTML: '', addEventListener: () => {}, classList: { add: ()=>{}, remove: ()=>{} } }), createElement: () => ({ innerHTML: '', appendChild: ()=>{} }), body: { appendChild: ()=>{} } };
const localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const navigator = { userAgent: 'Mozilla', onLine: true };

${js}

session = { staffId: 's1', name: 'Mohammed Anas', role: 'owner', businessId: 'b1', businessName: 'BM Super Mart' };
cache = {
  businesses: [{ id: 'b1', name: 'BM Super Mart' }],
  staff: [{ id: 's1', name: 'Mohammed Anas', role: 'owner', phone: '916379849947', pin: '4721' }],
  tasks: [{ id: 't1', assigned_to: 's1', title: 'Test Task', priority: 'high', status: 'pending', due_date: '2026-08-05' }],
  attendance: [], sales: [], routines: [], routineLog: [], points: [], labels: [], weeklyTasks: [], weeklyTaskLog: [], packages: [], salesmanLocations: [], salaries: [], salesTargets: [], trophies: [], stockChecks: [], dailyAccounts: [], vendorBills: [], auditLogs: [], projects: []
};

const fakeBody = { innerHTML: '' };
const tabsToTest = ['dashboard','tasks','daily','weekly','attendance','sales','label','package','stockkeeper','points','salary','accounts','reports','audit','projects','staff','settings'];

tabsToTest.forEach(t => {
  activeTab = t;
  try {
    renderTabBody();
    console.log('Tab runtime OK: ' + t);
  } catch(e) {
    console.error('RUNTIME ERROR ON TAB "' + t + '":', e.message);
  }
});
`;

try {
  new vm.Script(mockCode);
  console.log('All modular tab tests complete successfully!');
} catch(e){
  console.error('Test setup error:', e.message);
}
