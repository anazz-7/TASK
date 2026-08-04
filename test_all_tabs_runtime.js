const fs = require('fs');
const html = fs.readFileSync('C:/Users/mdana/.gemini/antigravity/scratch/babmtask/index.html', 'utf8');

const match = html.match(/<script type="module">([\s\S]*?)<\/script>\s*<\/body>/i);
let js = match[1];
js = js.replace(/import\s+[\s\S]*?;/g, 'const createClient = () => ({ from: () => ({ select: () => ({ eq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [] }), order: () => Promise.resolve({ data: [] }) }) }) }) }) });');

// Add mock DOM and globals
const mockCode = `
const window = { location: { href: '' }, addEventListener: () => {} };
const document = { getElementById: () => ({ innerHTML: '', addEventListener: () => {}, classList: { add: ()=>{}, remove: ()=>{} } }), createElement: () => ({ innerHTML: '', appendChild: ()=>{} }), body: { appendChild: ()=>{} } };
const localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const navigator = { userAgent: 'Mozilla', onLine: true };

` + js + `

// Test session & mock data
session = { staffId: 's1', name: 'Mohammed Anas', role: 'owner', businessId: 'b1', businessName: 'BM Super Mart' };
cache = {
  businesses: [{ id: 'b1', name: 'BM Super Mart' }],
  staff: [{ id: 's1', name: 'Mohammed Anas', role: 'owner', phone: '916379849947', pin: '4721' }],
  tasks: [{ id: 't1', assigned_to: 's1', title: 'Test Task', priority: 'high', status: 'pending', due_date: '2026-08-05' }],
  attendance: [], sales: [], routines: [], routineLog: [], points: [], labels: [], weeklyTasks: [], weeklyTaskLog: [], packages: [], salesmanLocations: [], salaries: [], salesTargets: [], trophies: [], stockChecks: [], dailyAccounts: [], vendorBills: [], auditLogs: []
};

const fakeBody = { innerHTML: '' };
const tabsToTest = ['dashboard','ai','tasks','daily','weekly','attendance','salesman','sales','label','package','stockkeeper','points','salary','accounts','vendors','reports','audit','staff','settings'];

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
  new (require('vm').Script)(mockCode);
  console.log('All tab tests complete!');
} catch(e){
  console.error('Test setup error:', e.message);
}
