const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    username: 'hamdisoudani',
    outputFile: path.join(__dirname, '..', 'assets', 'dashboard.svg'),
    width: 850,
    height: 460,
    theme: {
        bg: '#0d1117', // GitHub Dark Dim
        glass: 'rgba(22, 27, 34, 0.8)', // Semi-transparent panel
        glassBorder: 'rgba(48, 54, 61, 0.6)',
        text: '#c9d1d9',
        textMuted: '#8b949e',
        accentPrimary: '#58a6ff', // Blue
        accentSecondary: '#3fb950', // Green
        accentTertiary: '#f78166', // Orange
        font: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"'
    }
};

// SVG Helpers
const createSVG = (content, styles) => `
<svg width="${CONFIG.width}" height="${CONFIG.height}" viewBox="0 0 ${CONFIG.width} ${CONFIG.height}" xmlns="http://www.w3.org/2000/svg">
    <style>
        .text { font-family: ${CONFIG.theme.font}; fill: ${CONFIG.theme.text}; }
        .text-muted { fill: ${CONFIG.theme.textMuted}; }
        .text-accent { fill: ${CONFIG.theme.accentPrimary}; }
        .glass-panel { fill: ${CONFIG.theme.glass}; stroke: ${CONFIG.theme.glassBorder}; stroke-width: 1; rx: 10; }
        .icon { fill: ${CONFIG.theme.textMuted}; }

        /* Animations */
        @keyframes pulse {
            0% { opacity: 0.6; }
            50% { opacity: 1; }
            100% { opacity: 0.6; }
        }

        @media (prefers-reduced-motion: no-preference) {
            .animate-pulse { animation: pulse 2s infinite; }
        }

        ${styles}
    </style>
    <rect width="100%" height="100%" fill="${CONFIG.theme.bg}" rx="15" />
    ${content}
</svg>`;

// Helper to escape HTML/XML characters
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


async function fetchGitHubData(username) {
    const headers = {
        'User-Agent': 'github-profile-dashboard',
        'Accept': 'application/vnd.github.v3+json',
    };

    if (process.env.GITHUB_TOKEN) {
        headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    try {
        console.log(`Fetching data for ${username}...`);

        const [userRes, reposRes, eventsRes] = await Promise.all([
            fetch(`https://api.github.com/users/${username}`, { headers }),
            fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`, { headers }),
            fetch(`https://api.github.com/users/${username}/events/public?per_page=20`, { headers }) // Reduced to 20 for speed/relevance
        ]);

        if (!userRes.ok) throw new Error(`User fetch failed: ${userRes.status}`);

        const user = await userRes.json();
        const repos = reposRes.ok ? await reposRes.json() : [];
        const events = eventsRes.ok ? await eventsRes.json() : [];

        // Calculate Languages
        const languages = {};
        repos.forEach(repo => {
            if (repo.language) {
                languages[repo.language] = (languages[repo.language] || 0) + 1;
            }
        });
        const sortedLangs = Object.entries(languages)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5) // Top 5
            .map(([name, count]) => ({ name, count, percent: Math.round((count / repos.length) * 100) }));

        // Calculate Stats
        const totalStars = repos.reduce((acc, repo) => acc + repo.stargazers_count, 0);
        const totalForks = repos.reduce((acc, repo) => acc + repo.forks_count, 0);

        // Mock Streak (since we can't easily calculate true streak without GraphQL contribution calendar)
        // We'll use "Recent Activity" count as a proxy for "Current Momentum"
        const recentActivity = events.length;

        return {
            user,
            repos,
            events,
            languages: sortedLangs,
            stats: {
                stars: totalStars,
                forks: totalForks,
                repos: user.public_repos,
                followers: user.followers,
                momentum: recentActivity
            }
        };

    } catch (error) {
        console.error('Error fetching data:', error);
        // Return fallback data if fetch fails
        return {
            user: { login: username, name: 'Hamdi Soudani', bio: 'Full Stack Developer | DevOps', avatar_url: '' },
            repos: [],
            events: [],
            languages: [{name: 'TypeScript', percent: 40}, {name: 'Python', percent: 30}, {name: 'JavaScript', percent: 20}],
            stats: { stars: 0, forks: 0, repos: 0, followers: 0, momentum: 0 }
        };
    }
}

function generateSVGContent(data) {
    const { user, stats, languages, events } = data;

    // Formatting Helpers
    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // Icons (Simplified Paths)
    const icons = {
        star: '<path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"></path>',
        repo: '<path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z"></path>',
        fork: '<path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z"></path>',
        terminal: '<path d="M0 2.75C0 1.784.784 1 1.75 1h12.5c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 14.25 15H1.75A1.75 1.75 0 0 1 0 13.25Zm1.75-.25a.25.25 0 0 0-.25.25v10.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V2.75a.25.25 0 0 0-.25-.25ZM7.25 8a.75.75 0 0 1-.22.53l-2.25 2.25a.75.75 0 1 1-1.06-1.06L5.44 8 3.72 6.28a.75.75 0 1 1 1.06-1.06l2.25 2.25c.141.14.22.331.22.53Zm1.5 1.5h3a.75.75 0 0 1 0 1.5h-3a.75.75 0 0 1 0-1.5Z"></path>'
    };

    // --- Layout Construction ---

    // 1. Header (Top Left)
    const header = `
        <g transform="translate(30, 30)">
            <!-- Avatar Circle (Placeholder/Initials if no image logic) -->
            <circle cx="40" cy="40" r="38" fill="${CONFIG.theme.glass}" stroke="${CONFIG.theme.accentPrimary}" stroke-width="2" />
            <text x="40" y="50" text-anchor="middle" font-size="28" font-weight="bold" fill="${CONFIG.theme.text}">${user.name ? user.name.charAt(0) : 'U'}</text>

            <!-- Name & Title -->
            <text x="95" y="35" font-size="24" font-weight="bold" class="text">${escapeXml(user.name || user.login)}</text>
            <text x="95" y="60" font-size="14" class="text-muted">@${escapeXml(user.login)}</text>

            <!-- Bio/Tagline -->
            <text x="95" y="85" font-size="12" class="text-accent" style="opacity: 0.9;">${escapeXml(user.bio || 'Full Stack Developer & AI Specialist')}</text>
        </g>
    `;

    // 2. Stats Cards (Top Right)
    const statCards = `
        <g transform="translate(480, 30)">
            <!-- Stars -->
            <g transform="translate(0, 0)">
                <rect width="100" height="80" class="glass-panel" />
                <g transform="translate(20, 20) scale(1.5)" class="text-accent" style="fill: ${CONFIG.theme.accentTertiary};">${icons.star}</g>
                <text x="50" y="65" text-anchor="middle" font-size="18" font-weight="bold" class="text">${stats.stars}</text>
                <text x="50" y="80" text-anchor="middle" font-size="10" class="text-muted" dy="-2">Stars</text>
            </g>

            <!-- Forks -->
            <g transform="translate(115, 0)">
                <rect width="100" height="80" class="glass-panel" />
                <g transform="translate(20, 20) scale(1.5)" class="text-muted">${icons.fork}</g>
                <text x="50" y="65" text-anchor="middle" font-size="18" font-weight="bold" class="text">${stats.forks}</text>
                <text x="50" y="80" text-anchor="middle" font-size="10" class="text-muted" dy="-2">Forks</text>
            </g>

            <!-- Repos -->
            <g transform="translate(230, 0)">
                <rect width="100" height="80" class="glass-panel" />
                <g transform="translate(20, 20) scale(1.5)" class="text-accent">${icons.repo}</g>
                <text x="50" y="65" text-anchor="middle" font-size="18" font-weight="bold" class="text">${stats.repos}</text>
                <text x="50" y="80" text-anchor="middle" font-size="10" class="text-muted" dy="-2">Repos</text>
            </g>
        </g>
    `;

    // 3. Languages Section (Bottom Left)
    const langBars = languages.map((lang, i) => {
        const y = i * 25;
        const color = i === 0 ? CONFIG.theme.accentPrimary : (i === 1 ? CONFIG.theme.accentSecondary : CONFIG.theme.textMuted);
        return `
            <g transform="translate(0, ${y})">
                <text x="0" y="12" font-size="12" class="text" width="80">${escapeXml(lang.name)}</text>
                <rect x="90" y="2" width="${lang.percent * 2}" height="12" rx="4" fill="${color}" opacity="0.8" />
                <text x="${100 + (lang.percent * 2)}" y="12" font-size="10" class="text-muted">${lang.percent}%</text>
            </g>
        `;
    }).join('');

    const languagesSection = `
        <g transform="translate(30, 150)">
            <text x="0" y="0" font-size="14" font-weight="bold" class="text-muted" style="text-transform: uppercase; letter-spacing: 1px;">Top Languages</text>
            <g transform="translate(0, 20)">
                ${langBars}
            </g>
        </g>
    `;

    // 4. "Terminal" Activity Feed (Bottom Right)
    const activityLines = events.slice(0, 6).map((event, i) => {
        const type = event.type.replace('Event', '');
        const repo = event.repo.name.split('/')[1];
        const date = formatDate(event.created_at);
        const color = type === 'Push' ? CONFIG.theme.accentSecondary : (type === 'PullRequest' ? CONFIG.theme.accentPrimary : CONFIG.theme.textMuted);

        return `
            <text x="15" y="${30 + (i * 20)}" font-family="monospace" font-size="11" class="text">
                <tspan fill="${CONFIG.theme.textMuted}">[${date}]</tspan>
                <tspan fill="${color}" font-weight="bold">${type}</tspan>
                <tspan fill="${CONFIG.theme.textMuted}">@</tspan>
                <tspan fill="${CONFIG.theme.text}">${escapeXml(repo)}</tspan>
            </text>
        `;
    }).join('');

    const terminalSection = `
        <g transform="translate(350, 140)">
            <rect width="470" height="180" class="glass-panel" fill="rgba(0,0,0,0.3)" />

            <!-- Terminal Header -->
            <rect width="470" height="24" rx="10" fill="rgba(255,255,255,0.05)" />
            <circle cx="15" cy="12" r="4" fill="#ff5f56" />
            <circle cx="30" cy="12" r="4" fill="#ffbd2e" />
            <circle cx="45" cy="12" r="4" fill="#27c93f" />
            <text x="235" y="16" text-anchor="middle" font-family="monospace" font-size="10" class="text-muted">dev@${escapeXml(user.login)}:~/activity</text>

            <!-- Terminal Content -->
            <g transform="translate(0, 10)">
                ${activityLines}
                <g transform="translate(15, ${30 + (events.length > 6 ? 6 : events.length) * 20})">
                     <text font-family="monospace" font-size="11" class="text-accent animate-pulse">_</text>
                </g>
            </g>
        </g>
    `;

    // 5. Footer / Status
    const footer = `
        <g transform="translate(30, 420)">
             <text font-family="monospace" font-size="10" class="text-muted">
                System Status: <tspan fill="${CONFIG.theme.accentSecondary}">ONLINE</tspan> |
                Last Updated: <tspan fill="${CONFIG.theme.text}">${new Date().toISOString().split('T')[0]} UTC</tspan>
            </text>
        </g>
    `;

    return header + statCards + languagesSection + terminalSection + footer;
}

async function main() {
    try {
        const data = await fetchGitHubData(CONFIG.username);
        const svgContent = generateSVGContent(data);
        const svg = createSVG(svgContent, ''); // No extra CSS needed as it's inline

        // Ensure directory exists
        const dir = path.dirname(CONFIG.outputFile);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(CONFIG.outputFile, svg);
        console.log(`✅ Dashboard generated at: ${CONFIG.outputFile}`);

    } catch (error) {
        console.error('❌ Failed to generate dashboard:', error);
        process.exit(1);
    }
}

main();
