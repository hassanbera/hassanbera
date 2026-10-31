import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const login = 'hassanbera';
const query = `query { user(login:"${login}") { repositories(first:100,privacy:PUBLIC,ownerAffiliations:OWNER,isFork:false) { totalCount nodes { name languages(first:100){edges{size node{name color}}} } } } search(query:"author:${login} is:pr is:merged is:public",type:ISSUE,first:1){issueCount} }`;
const api = (...args) => JSON.parse(execFileSync('gh', ['api', ...args], { encoding: 'utf8' }));
const account = api(`users/${login}`);
const { data, errors } = api('graphql', '-f', `query=${query}`);
if (errors) throw new Error(JSON.stringify(errors));
const repos = data.user.repositories;
if (repos.totalCount > repos.nodes.length) throw new Error('Add repository pagination before refreshing more than 100 public repositories.');
const totals = new Map();
const featured = repos.nodes.filter(repo => /^(taskboard|paytrack|hookwatch|slotbook)(-(spring|dotnet))?$/.test(repo.name));
for (const repo of featured) for (const {size,node} of repo.languages.edges) {
 const old = totals.get(node.name) || {size:0,color:node.color || '#8395a7'};
 totals.set(node.name,{size:old.size+size,color:old.color});
}
const sorted = [...totals].sort((a,b)=>b[1].size-a[1].size);
const total = sorted.reduce((n,[,v])=>n+v.size,0);
const languages = sorted.slice(0,5);
const remaining = sorted.slice(5).reduce((n,[,v])=>n+v.size,0);
if(remaining)languages.push(['Other',{size:remaining,color:'#768b9c'}]);
const stamp = new Date().toISOString().slice(0,10);
const esc = x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
let rows='';
for(let i=0;i<languages.length;i++){
 const [name,v]=languages[i],percent=total?v.size/total*100:0,y=76+i*27;
 rows+=`<circle cx="504" cy="${y-4}" r="4" fill="${v.color}"/><text x="518" y="${y}" fill="#b9cad5" font-size="11">${esc(name)}</text><rect x="645" y="${y-9}" width="172" height="6" rx="3" fill="#23394b"/><rect x="645" y="${y-9}" width="${(172*percent/100).toFixed(1)}" height="6" rx="3" fill="${v.color}"/><text x="867" y="${y}" text-anchor="end" fill="#8ba4b4" font-size="10">${percent.toFixed(1)}%</text>`;
}
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="920" height="277" viewBox="0 0 920 277" role="img" aria-labelledby="title desc">
<title id="title">Public GitHub snapshot · ${stamp}</title><desc id="desc">${account.public_repos} public repositories and ${data.search.issueCount} merged public pull requests. Language distribution by code bytes in ${featured.length} public implementations of the featured applications.</desc>
<rect width="920" height="277" rx="13" fill="#101e2e"/>
<g font-family="Arial,Helvetica,sans-serif"><text x="30" y="35" font-size="10" letter-spacing="2" fill="#79ddc6">BUILDING IN PUBLIC</text><text x="30" y="94" font-size="43" font-weight="700" fill="#edf6fa">${account.public_repos}</text><text x="30" y="120" font-size="12" fill="#9db4c3">Public repositories</text><text x="251" y="94" font-size="43" font-weight="700" fill="#edf6fa">${data.search.issueCount}</text><text x="251" y="120" font-size="12" fill="#9db4c3">Merged public PRs</text><path d="M30 148H426" stroke="#294052"/><text x="30" y="181" font-size="12" fill="#c0d2dc">From first commit to working application.</text><text x="30" y="207" font-size="10" fill="#7895a8">Real projects · Separate repositories · Tested flows</text><text x="30" y="246" font-size="9" fill="#67869b">GitHub API snapshot / ${stamp}</text><path d="M466 29V248" stroke="#294052"/><text x="500" y="35" font-size="10" letter-spacing="2" fill="#79ddc6">FEATURED PROJECT LANGUAGES</text>${rows}<text x="500" y="254" font-size="9" fill="#67869b">By bytes across ${featured.length} public implementations of the featured apps.</text></g></svg>`;
mkdirSync(root+'assets',{recursive:true});
writeFileSync(root+'assets/github-snapshot.svg',svg+'\n');
console.log(`Updated public snapshot for ${login} on ${stamp}.`);
