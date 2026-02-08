const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    username: 'hamdisoudani',
    outputFile: path.join(__dirname, '..', 'assets', 'dashboard.svg'),
    width: 850,
    height: 520, // Increased height for more data
    theme: {
        bg: '#0d1117', // GitHub Dark Dim
        glass: 'rgba(22, 27, 34, 0.85)',
        glassBorder: 'rgba(48, 54, 61, 0.8)',
        text: '#c9d1d9',
        textMuted: '#8b949e',
        accentPrimary: '#58a6ff', // Blue
        accentSecondary: '#3fb950', // Green
        accentTertiary: '#f78166', // Orange
        font: '-apple-system, BlinkMacSystemFont, \'Segoe UI\', Helvetica, Arial, sans-serif, \'Apple Color Emoji\', \'Segoe UI Emoji\''
    }
};

// SVG Helper
const createSVG = (content, styles) => `
<svg width="${CONFIG.width}" height="${CONFIG.height}" viewBox="0 0 ${CONFIG.width} ${CONFIG.height}" xmlns="http://www.w3.org/2000/svg">
    <style>
        .text { font-family: ${CONFIG.theme.font}; fill: ${CONFIG.theme.text}; }
        .text-muted { fill: ${CONFIG.theme.textMuted}; }
        .text-accent { fill: ${CONFIG.theme.accentPrimary}; }
        .glass-panel { fill: ${CONFIG.theme.glass}; stroke: ${CONFIG.theme.glassBorder}; stroke-width: 1; rx: 12; }
        .glass-panel-inner { fill: rgba(255, 255, 255, 0.03); stroke: rgba(255, 255, 255, 0.05); stroke-width: 1; rx: 8; }
        .icon { fill: ${CONFIG.theme.textMuted}; }

        @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
        .animate-pulse { animation: pulse 2s infinite; }

        ${styles}
    </style>
    <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#0d1117;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#161b22;stop-opacity:1" />
        </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#bgGradient)" rx="15" />
    ${content}
</svg>`;

const escapeXml = (unsafe) => {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
};

// GraphQL Query
const GRAPHQL_QUERY = `
query($username: String!) {
  user(login: $username) {
    name
    login
    bio
    avatarUrl
    location
    company
    websiteUrl
    twitterUsername
    isHireable
    createdAt
    followers { totalCount }
    following { totalCount }
    starredRepositories { totalCount }
    repositories(first: 100, ownerAffiliations: OWNER, orderBy: {field: STARGAZERS, direction: DESC}, isFork: false) {
      totalCount
      totalDiskUsage
      nodes {
        name
        stargazerCount
        forkCount
        primaryLanguage {
          name
          color
        }
        diskUsage
      }
    }
    contributionsCollection {
      totalCommitContributions
      totalPullRequestContributions
      totalPullRequestReviewContributions
      totalIssueContributions
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            contributionCount
            date
            color
          }
        }
      }
    }
    pinnedItems(first: 6, types: [REPOSITORY]) {
      nodes {
        ... on Repository {
          name
          description
          stargazerCount
          forkCount
          primaryLanguage {
            name
            color
          }
        }
      }
    }
  }
}
`;

async function fetchGitHubData(username) {
    const token = process.env.TOKEN || process.env.GITHUB_TOKEN;
    if (!token) {
        console.error('❌ No GitHub token found (GITHUB_TOKEN or TOKEN).');
        process.exit(1);
    }

    try {
        console.log(`Fetching comprehensive data for ${username}...`);
        const response = await fetch('https://api.github.com/graphql', {
            method: 'POST',
            headers: {
                'Authorization': `bearer ${token}`,
                'Content-Type': 'application/json',
                'User-Agent': 'github-profile-dashboard'
            },
            body: JSON.stringify({ query: GRAPHQL_QUERY, variables: { username } })
        });

        const json = await response.json();
        if (json.errors) {
            throw new Error(JSON.stringify(json.errors));
        }
        return json.data.user;
    } catch (error) {
        console.error('❌ Failed to fetch data:', error);
        process.exit(1);
    }
}

function generateSVGContent(user) {
    // --- Data Processing ---
    const totalStars = user.repositories.nodes.reduce((acc, repo) => acc + repo.stargazerCount, 0);
    const totalForks = user.repositories.nodes.reduce((acc, repo) => acc + repo.forkCount, 0);
    const totalContribs = user.contributionsCollection.contributionCalendar.totalContributions;

    // Language Stats
    const langStats = {};
    let totalSize = 0;
    user.repositories.nodes.forEach(repo => {
        if (repo.primaryLanguage) {
            // Using diskUsage as proxy for size/impact if available, otherwise just count
            // Since GraphQL gives diskUsage per repo, let's use that for weighting
            const size = repo.diskUsage || 1;
            langStats[repo.primaryLanguage.name] = (langStats[repo.primaryLanguage.name] || 0) + size;
            totalSize += size;
        }
    });
    const topLanguages = Object.entries(langStats)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, size]) => ({
            name,
            percent: Math.round((size / totalSize) * 100)
        }));

    // Icons
    const icons = {
        star: '<path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"/>',
        fork: '<path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z"/>',
        repo: '<path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z"/>',
        location: '<path d="M11.536 3.464a5 5 0 0 1 0 7.072L8 14.07l-3.536-3.535a5 5 0 1 1 7.072-7.072v.001Zm-1.06 1.06a3.5 3.5 0 1 0-4.95 4.95L8 11.95l2.475-2.475a3.5 3.5 0 0 0 0-4.95Z"/>',
        company: '<path d="M1.75 1A1.75 1.75 0 0 0 0 2.75v9.5C0 13.216.784 14 1.75 14h12.5c.966 0 1.75-.784 1.75-1.75v-9.5A1.75 1.75 0 0 0 14.25 1H1.75Zm1.75 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5a.75.75 0 0 1 .75-.75ZM7 7a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 7 7Zm4.25 0a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5a.75.75 0 0 1 .75-.75Z"/>'
    };

    // --- Layout ---

    // 1. Header (Left)
    const header = `
        <g transform="translate(30, 30)">
            <!-- Avatar Ring -->
            <circle cx="40" cy="40" r="38" fill="none" stroke="${CONFIG.theme.accentPrimary}" stroke-width="2" stroke-dasharray="238" stroke-dashoffset="30" transform="rotate(-90 40 40)" />

            <!-- Default Avatar Placeholder (We don't fetch image bytes, just show initial) -->
            <circle cx="40" cy="40" r="34" fill="${CONFIG.theme.glass}" />
            <text x="40" y="52" text-anchor="middle" font-size="28" font-weight="bold" fill="${CONFIG.theme.text}">${user.login.charAt(0).toUpperCase()}</text>

            <text x="95" y="30" font-size="24" font-weight="bold" class="text">${escapeXml(user.name || user.login)}</text>
            <text x="95" y="50" font-size="14" class="text-muted">@${escapeXml(user.login)}</text>

            <!-- Bio -->
            <foreignObject x="95" y="60" width="400" height="40">
                <div xmlns="http://www.w3.org/1999/xhtml" style="color: ${CONFIG.theme.textMuted}; font-size: 12px; font-family: ${CONFIG.theme.font}; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
                    ${escapeXml(user.bio || 'Full Stack Developer')}
                </div>
            </foreignObject>

            <!-- Metadata Row -->
            <g transform="translate(95, 80)">
                ${user.location ? `
                <g transform="translate(0, 0)">
                    <g transform="scale(0.8)" class="text-muted">${icons.location}</g>
                    <text x="18" y="10" font-size="11" class="text-muted">${escapeXml(user.location)}</text>
                </g>` : ''}

                ${user.company ? `
                <g transform="translate(${user.location ? 120 : 0}, 0)">
                    <g transform="scale(0.8)" class="text-muted">${icons.company}</g>
                    <text x="18" y="10" font-size="11" class="text-muted">${escapeXml(user.company)}</text>
                </g>` : ''}
            </g>
        </g>
    `;

    // 2. Main Stats Grid (Right)
    const stats = [
        { label: 'Total Contributions', value: totalContribs, icon: icons.repo, color: CONFIG.theme.accentSecondary },
        { label: 'Followers', value: user.followers.totalCount, icon: icons.star, color: CONFIG.theme.accentPrimary },
        { label: 'Total Stars', value: totalStars, icon: icons.star, color: CONFIG.theme.accentTertiary },
        { label: 'Repositories', value: user.repositories.totalCount, icon: icons.repo, color: CONFIG.theme.text }
    ];

    const statsGrid = `
        <g transform="translate(500, 30)">
            ${stats.map((stat, i) => {
                const x = (i % 2) * 160;
                const y = Math.floor(i / 2) * 60;
                return `
                <g transform="translate(${x}, ${y})">
                    <rect width="150" height="50" class="glass-panel" fill-opacity="0.5" />
                    <text x="15" y="20" font-size="10" class="text-muted" style="text-transform: uppercase;">${stat.label}</text>
                    <text x="15" y="40" font-size="18" font-weight="bold" fill="${stat.color}">${stat.value.toLocaleString()}</text>
                </g>
                `;
            }).join('')}
        </g>
    `;

    // 3. Expanded Stats (Below Header)
    const expandedStats = `
        <g transform="translate(30, 140)">
            <rect width="790" height="70" class="glass-panel" />

            <g transform="translate(30, 25)">
                <text x="0" y="0" font-size="10" class="text-muted">COMMITS (Year)</text>
                <text x="0" y="20" font-size="16" font-weight="bold" class="text">${user.contributionsCollection.totalCommitContributions}</text>
            </g>
            <line x1="150" y1="10" x2="150" y2="60" stroke="${CONFIG.theme.glassBorder}" />

            <g transform="translate(180, 25)">
                <text x="0" y="0" font-size="10" class="text-muted">PULL REQUESTS</text>
                <text x="0" y="20" font-size="16" font-weight="bold" class="text">${user.contributionsCollection.totalPullRequestContributions}</text>
            </g>
            <line x1="300" y1="10" x2="300" y2="60" stroke="${CONFIG.theme.glassBorder}" />

            <g transform="translate(330, 25)">
                <text x="0" y="0" font-size="10" class="text-muted">ISSUES</text>
                <text x="0" y="20" font-size="16" font-weight="bold" class="text">${user.contributionsCollection.totalIssueContributions}</text>
            </g>
            <line x1="450" y1="10" x2="450" y2="60" stroke="${CONFIG.theme.glassBorder}" />

            <g transform="translate(480, 25)">
                <text x="0" y="0" font-size="10" class="text-muted">REVIEWS</text>
                <text x="0" y="20" font-size="16" font-weight="bold" class="text">${user.contributionsCollection.totalPullRequestReviewContributions}</text>
            </g>
            <line x1="600" y1="10" x2="600" y2="60" stroke="${CONFIG.theme.glassBorder}" />

            <g transform="translate(630, 25)">
                <text x="0" y="0" font-size="10" class="text-muted">CONTRIBUTIONS</text>
                <text x="0" y="20" font-size="16" font-weight="bold" class="text-accent">${totalContribs}</text>
            </g>
        </g>
    `;

    // 4. Languages & Pinned Repos (Middle)

    // Languages Bar
    const langSection = `
        <g transform="translate(30, 240)">
            <text x="0" y="0" font-size="14" font-weight="bold" class="text">Top Languages</text>
            <g transform="translate(0, 20)">
                ${topLanguages.map((lang, i) => `
                    <g transform="translate(0, ${i * 25})">
                        <text x="0" y="10" font-size="12" class="text" width="80">${escapeXml(lang.name)}</text>
                        <rect x="100" y="2" width="${lang.percent * 2.5}" height="8" rx="4" fill="${i === 0 ? CONFIG.theme.accentPrimary : (i === 1 ? CONFIG.theme.accentSecondary : CONFIG.theme.textMuted)}" />
                        <text x="${110 + (lang.percent * 2.5)}" y="10" font-size="10" class="text-muted">${lang.percent}%</text>
                    </g>
                `).join('')}
            </g>
        </g>
    `;

    // Pinned Repos (Right side of Languages)
    const pinnedRepos = user.pinnedItems.nodes;
    const pinnedSection = `
        <g transform="translate(300, 240)">
            <text x="0" y="0" font-size="14" font-weight="bold" class="text">Featured Projects</text>
            <g transform="translate(0, 20)">
                ${pinnedRepos.slice(0, 4).map((repo, i) => {
                    const x = (i % 2) * 260;
                    const y = Math.floor(i / 2) * 70;
                    return `
                    <g transform="translate(${x}, ${y})">
                        <rect width="250" height="60" class="glass-panel" fill-opacity="0.3" />
                        <text x="10" y="20" font-size="12" font-weight="bold" class="text-accent">${escapeXml(repo.name)}</text>
                        <text x="10" y="35" font-size="10" class="text-muted" style="opacity:0.8">${escapeXml(repo.description || '').substring(0, 40)}${repo.description && repo.description.length > 40 ? '...' : ''}</text>
                        <g transform="translate(10, 48)">
                            <circle cx="3" cy="3" r="3" fill="${repo.primaryLanguage ? repo.primaryLanguage.color : '#ccc'}" />
                            <text x="10" y="6" font-size="9" class="text-muted">${repo.primaryLanguage ? repo.primaryLanguage.name : 'Unknown'}</text>

                            <g transform="translate(80, 0) scale(0.8)" class="text-muted">${icons.star}</g>
                            <text x="95" y="6" font-size="9" class="text-muted">${repo.stargazerCount}</text>

                            <g transform="translate(120, 0) scale(0.8)" class="text-muted">${icons.fork}</g>
                            <text x="135" y="6" font-size="9" class="text-muted">${repo.forkCount}</text>
                        </g>
                    </g>
                    `;
                }).join('')}
            </g>
        </g>
    `;

    // 5. Contribution Calendar (Bottom)
    // We need to render the weeks.
    // The API returns weeks. Each week has contributionDays.
    // We'll render the last ~25 weeks to fit.
    const weeks = user.contributionsCollection.contributionCalendar.weeks;
    const lastWeeks = weeks.slice(-38); // Adjust number of weeks to fit width

    const calendar = `
        <g transform="translate(30, 400)">
            <text x="0" y="-10" font-size="12" font-weight="bold" class="text-muted">Contribution Activity</text>
            <g transform="translate(0, 0)">
                ${lastWeeks.map((week, wIndex) => {
                    return week.contributionDays.map((day, dIndex) => {
                        // Map GitHub colors to our theme or keep them
                        // GitHub colors: #ebedf0, #9be9a8, #40c463, #30a14e, #216e39 (light mode)
                        // We might want to use the color provided or map to our dark theme
                        let fill = day.color;
                        if (day.contributionCount === 0) fill = 'rgba(255,255,255,0.05)';

                        return `<rect x="${wIndex * 14}" y="${dIndex * 14}" width="10" height="10" rx="2" fill="${fill}" />`;
                    }).join('');
                }).join('')}
            </g>
        </g>
    `;

    // Footer
    const footer = `
        <g transform="translate(30, 500)">
             <text font-family="monospace" font-size="10" class="text-muted">
                Generated with GitHub GraphQL API | ${new Date().toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'})} UTC
            </text>
        </g>
    `;

    return header + statsGrid + expandedStats + langSection + pinnedSection + calendar + footer;
}

async function main() {
    const user = await fetchGitHubData(CONFIG.username);
    const svgContent = generateSVGContent(user);
    const svg = createSVG(svgContent, '');

    const dir = path.dirname(CONFIG.outputFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(CONFIG.outputFile, svg);
    console.log(`✅ Dashboard generated at: ${CONFIG.outputFile}`);
}

main();
