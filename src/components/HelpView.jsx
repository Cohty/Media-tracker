import { useState } from 'react'

const SECTIONS = [
  {
    title: '🚀 Getting Started',
    color: '#00e5ff',
    faqs: [
      {
        q: 'What is Media Tracker?',
        a: `Media Tracker is a private dashboard for The Block's media team to log, organize, and measure all published content across every platform — YouTube, X (Twitter), TikTok, LinkedIn, Instagram, and more. Think of it as a single source of truth for everything you've published and how it's performing.`,
      },
      {
        q: 'How do I log a new post?',
        a: `Click the pink "+ LOG POST" button in the top right. Paste the URL of your post and the title will auto-fetch if it's a YouTube link. Then select the show it belongs to, the media type (Clip, Full Episode, Broadcast, etc.), and optionally the episode number. Hit Enter or click Submit.`,
      },
      {
        q: 'What are the different sections/tabs?',
        a: `• BOARD — Kanban-style view of all posts organized by show column\n• CALENDAR — Posts laid out by publish date with metrics inline\n• ANALYTICS — Performance charts and stats table with Sprout sync\n• PODCAST — Transistor.fm download data for The Crypto Beat, Layer One, and The Big Brain Podcast\n• INBOX — Triage view for sorting unassigned or imported posts\n• HELP — You're here`,
      },
    ],
  },
  {
    title: '📋 The Board',
    color: '#b44eff',
    faqs: [
      {
        q: 'What are the columns on the board?',
        a: `Each column represents a show or content category:\n• The Crypto Beat, The Big Brain Podcast, Layer One, The White Papers — your main podcast shows\n• Standalones — one-off videos or clips not tied to a series\n• Editorials — Instagram + LinkedIn cross-posted article content\n• Newsroom — @TheBlockCo X/Twitter news headlines with article links\n• Unassigned — anything imported that hasn't been categorized yet`,
      },
      {
        q: 'What do the colored pills on each card mean?',
        a: `• Platform pill (YouTube, X, TikTok, etc.) — where the content lives\n• Media type pill (Clip, Full Episode, Broadcast, Article, Thread, Reply, Partner Post) — what kind of content it is\n• Episode number pill — which episode of the show it belongs to\n• Clip2, Clip3, etc. — if there are multiple clips for the same episode, they're numbered automatically`,
      },
      {
        q: 'What are the grouped "EP 72", "EP 73" sections in columns?',
        a: `When multiple posts share the same episode number, they collapse into a group. Click the group header to expand it and see all individual posts inside. The collapsed view shows platform pills and clip labels at a glance. There's also a checkbox on the group header to select all posts in that group at once.`,
      },
      {
        q: 'How do I filter the board by date?',
        a: `Use the date range bar that appears below the nav tabs when you're on the Board view. Choose This Week (default), Last 14 Days, Last 30 Days, All Time, or a custom date range. The board and all six stats cards update to reflect only posts from that period.`,
      },
      {
        q: 'How do I edit a post?',
        a: `Click the "Edit" button on any card (it appears when you hover over a card or expand an episode group). A modal opens where you can change the show, media type, and episode number or label. Hit Enter or click Save Changes. Changes save immediately to the database.`,
      },
    ],
  },
  {
    title: '🏷️ Media Types',
    color: '#f0a020',
    faqs: [
      {
        q: 'What media types are available and what do they mean?',
        a: `• Clip — a short clip pulled from an episode (TikTok clips auto-assign to this)\n• Full Episode — the complete episode video\n• Broadcast — a live stream or broadcast version\n• Article — a written article or editorial post\n• Thread — a multi-post Twitter/X thread\n• Reply — a reply or quote tweet with notable engagement\n• Partner Post — content created in partnership with a sponsor or partner`,
      },
      {
        q: 'How does clip numbering work?',
        a: `If you log multiple clips for the same show and episode, they're automatically numbered: Clip, Clip2, Clip3, etc. This happens when you log them via the Log Post modal or when importing from Sprout. The system counts existing clips for that show+episode combo and assigns the next number.`,
      },
      {
        q: 'Can I add a custom label instead of an episode number?',
        a: `Yes. The Episode # field accepts any text — not just numbers. You can type "Polymarket", "Q1 2026", "CoinDesk", or any label that makes sense. That label appears on the card and groups posts with the same label together on the board.`,
      },
    ],
  },
  {
    title: '📊 Analytics & Metrics',
    color: '#ff2d78',
    faqs: [
      {
        q: 'Where do the view/engagement/impression numbers come from?',
        a: `All metrics come directly from Sprout Social, which pulls them from each platform's native API (X, YouTube, LinkedIn, TikTok, Instagram). These are the same numbers you'd see in Sprout's own dashboard — 100% accurate to what each platform reports. They're "lifetime" metrics, meaning total since the post was published.`,
      },
      {
        q: 'How do I sync stats from Sprout?',
        a: `Go to the Analytics tab and click "Sync Sprout". It fetches the last 365 days of post data from Sprout, matches URLs to your logged posts, and updates the views, engagement, and impressions fields. The sync never overwrites your show assignments, media types, or other manual edits — it only touches the three metric fields.`,
      },
      {
        q: 'How do I import posts directly from Sprout?',
        a: `In the Analytics tab, click "Import from Sprout". Choose which platforms to pull from and how far back. The importer uses your Sprout tags to auto-assign posts to the right show — tags like "TCB 73" map to The Crypto Beat Episode 73, "L1 01" maps to Layer One Episode 1, etc. Unrecognized posts land in the Newsroom or Unassigned column where you can sort them in the Inbox tab.`,
      },
      {
        q: 'What do the stats bar numbers at the top mean?',
        a: `• Total Posts — how many posts exist in the selected date range\n• Shows Active — how many shows have content in that range\n• Top Platform — which platform has the most posts\n• Total Views — sum of all video views across all matched posts\n• Total Engagement — sum of all likes, comments, shares\n• Total Impressions — sum of all impressions across all platforms\n\nHover over Views, Engagement, or Impressions to see the full unabbreviated number.`,
      },
      {
        q: 'Can I export data to a spreadsheet?',
        a: `Yes, two ways:\n1. In Analytics, click the yellow "⬇ CSV" button to export whatever your current filter shows\n2. On the Board, batch-select posts using the checkboxes on cards, then click "⬇ Export CSV" in the purple batch bar that appears\n\nBoth exports include Title, Show, Platform, Media Type, Episode, Date, Views, Engagement, Impressions, and URL.`,
      },
    ],
  },
  {
    title: '🎙️ Podcast Tab',
    color: '#39ff8c',
    faqs: [
      {
        q: 'What shows appear in the Podcast tab?',
        a: `Only The Crypto Beat, Layer One, and The Big Brain Podcast. The Scoop and The Block Research Podcast are excluded. Click "All Shows" to see combined data across all three, or click a specific show to drill in.`,
      },
      {
        q: 'What data comes from Transistor?',
        a: `Transistor's API provides total downloads per episode and daily download trends. These use the IAB 2.0 standard — the industry standard for podcast measurement. You can view 7, 14, or 30-day windows and sort episodes by downloads or publish date.`,
      },
      {
        q: 'Why are Spotify Streams and Apple Listens not shown?',
        a: `Transistor's API doesn't expose per-platform breakdowns — only total downloads. Spotify and Apple listener counts are only available inside those platforms' own dashboards. Downloads (what Transistor reports) measure audio file deliveries, which is a different metric from platform-side streams.`,
      },
    ],
  },
  {
    title: '📬 Inbox',
    color: '#ff9de2',
    faqs: [
      {
        q: 'What is the Inbox for?',
        a: `The Inbox is a triage view for posts that haven't been properly categorized yet — mainly content imported from Sprout that landed in Newsroom or Unassigned because it didn't match a known tag. Use it to bulk-sort posts: change their show, media type, and episode label all from one screen without opening individual modals.`,
      },
      {
        q: 'How do I use the Inbox to assign posts?',
        a: `Filter by show (e.g. Newsroom), then for each row use the Show dropdown, Type dropdown, and EP/Label field to assign it. When you change anything, the row highlights purple. Hit Enter in the label field or click Save to commit. A green "✓ saved" confirmation appears briefly. You can also use the search bar to find specific content by keyword.`,
      },
    ],
  },
  {
    title: '✅ Batch Actions',
    color: '#00e5ff',
    faqs: [
      {
        q: 'How do I select multiple posts at once?',
        a: `On the Board, hover over any card to reveal a small checkbox in the top-right corner. Click it to select. For episode groups, click the checkbox next to the post count in the group header to select or deselect all posts in that group. You can select posts across multiple columns and groups at once.`,
      },
      {
        q: 'What can I do with batch-selected posts?',
        a: `Once posts are selected, a purple bar appears at the top of the board with:\n• Move to show — reassign all selected posts to a different show\n• Change type — change media type for all selected\n• Apply — executes the above changes\n• ⬇ Export CSV — download a spreadsheet of selected posts with all metrics\n• 🗑 Delete — delete all selected posts (with confirmation)`,
      },
    ],
  },
]

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => setOpen(v => !v)}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', gap: 12 }}>
        <div style={{ fontFamily: 'DM Mono', fontSize: 11, color: 'var(--text)', lineHeight: 1.4 }}>{q}</div>
        <span style={{ fontFamily: 'DM Mono', fontSize: 12, color: 'var(--text3)', flexShrink: 0,
          transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>
      </div>
      {open && (
        <div style={{ padding: '0 16px 14px', fontFamily: 'DM Mono', fontSize: 10,
          color: 'var(--text2)', lineHeight: 1.9, whiteSpace: 'pre-line',
          borderLeft: '2px solid var(--border2)', marginLeft: 16 }}>
          {a}
        </div>
      )}
    </div>
  )
}

export default function HelpView() {
  const [activeSection, setActiveSection] = useState(null)

  const filtered = activeSection ? SECTIONS.filter(s => s.title === activeSection) : SECTIONS

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 24px 60px' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'Press Start 2P', fontSize: 11, color: 'var(--purple)',
          textShadow: '0 0 14px rgba(180,78,255,0.7)', marginBottom: 8 }}>
          HELP & FAQ
        </div>
        <div style={{ fontFamily: 'DM Mono', fontSize: 10, color: 'var(--text3)', lineHeight: 1.8 }}>
          Everything you need to know about using Media Tracker.
          Click any question to expand the answer.
        </div>
      </div>

      {/* Section filter pills */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        <button className={`metric-btn${!activeSection ? ' active' : ''}`}
          style={!activeSection ? { color: 'var(--purple)', borderColor: 'rgba(180,78,255,0.4)' } : {}}
          onClick={() => setActiveSection(null)}>All Topics</button>
        {SECTIONS.map(s => (
          <button key={s.title} className={`metric-btn${activeSection === s.title ? ' active' : ''}`}
            style={activeSection === s.title ? { color: s.color, borderColor: s.color + '55' } : {}}
            onClick={() => setActiveSection(activeSection === s.title ? null : s.title)}>
            {s.title}
          </button>
        ))}
      </div>

      {/* FAQ sections */}
      {filtered.map(section => (
        <div key={section.title} className="win95-window" style={{ marginBottom: 16 }}>
          <div className="win95-titlebar" style={{ background: `linear-gradient(90deg, #0f0c1e, ${section.color}22)`,
            borderBottom: `1px solid ${section.color}33` }}>
            <span className="win95-title" style={{ color: section.color }}>{section.title}</span>
          </div>
          <div>
            {section.faqs.map(faq => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      ))}

      {/* Footer note */}
      <div style={{ fontFamily: 'DM Mono', fontSize: 9, color: 'var(--text3)',
        textAlign: 'center', marginTop: 32, lineHeight: 1.8 }}>
        Built for The Block media team · Powered by Cloudflare Pages + D1 + Sprout Social + Transistor.fm
      </div>
    </div>
  )
}
