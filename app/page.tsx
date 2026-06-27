'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Music, Monitor, Coffee, Camera, Sparkles, Building2,
  LayoutDashboard, BarChart3, Sword, Target, Coins, BookOpen,
  Plus, X, Check, Pencil, TrendingUp, TrendingDown, DollarSign,
  Zap, Flame, Trophy, Crown, Shield, Star, Rocket,
  CheckCircle2, Mic2, ChevronRight, ChevronDown, RefreshCw, Lock
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
type Status = 'active' | 'slow-burn' | 'passive'
type TabId  = 'hub' | 'stats' | 'quests' | 'missions' | 'treasury' | 'wisdom'

interface Mission { id: string; name: string; Icon: React.ComponentType<any>; status: Status; color: string; goal: string; timeline: string }
interface Task    { id: string; missionId: string; text: string; done: boolean; date: string }
interface Income  { id: string; source: string; missionId: string; amount: number; date: string }
interface Expense { id: string; category: string; amount: number; date: string }
interface Achievement { id: string; name: string; desc: string; Icon: React.ComponentType<any>; color: string; xpReward: number; check: (i: Income[], t: Task[], streak: number) => boolean }
interface Quote   { id: string; text: string; author: string; tag: string }
type Notes = Record<string, string>

// ─── Dark Palette ─────────────────────────────────────────────────────────────
const C = {
  bg:      '#09091A',
  card:    '#0F0E24',
  card2:   '#14132C',
  border:  '#1E1C3A',
  text:    '#EEEEFF',
  muted:   '#7876A0',
  faint:   '#35335A',
  purple:  '#A78BFA',
  cyan:    '#22D3EE',
  gold:    '#FBBF24',
  green:   '#34D399',
  pink:    '#F472B6',
  orange:  '#FB923C',
  red:     '#F87171',
  blue:    '#60A5FA',
}

// ─── Levels ───────────────────────────────────────────────────────────────────
const LEVELS = [
  { level: 1, name: 'Starter',  minXP: 0,     color: C.muted  },
  { level: 2, name: 'Grinder',  minXP: 200,   color: C.blue   },
  { level: 3, name: 'Hustler',  minXP: 500,   color: C.purple },
  { level: 4, name: 'Builder',  minXP: 1000,  color: C.cyan   },
  { level: 5, name: 'Operator', minXP: 2500,  color: C.green  },
  { level: 6, name: 'Earner',   minXP: 5000,  color: C.gold   },
  { level: 7, name: 'Boss',     minXP: 10000, color: C.pink   },
]

function getLevel(xp: number) {
  let cur  = LEVELS[0]
  let next = LEVELS[1]
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXP) {
      cur  = LEVELS[i]
      next = LEVELS[Math.min(i + 1, LEVELS.length - 1)]
      break
    }
  }
  const xpIn  = xp - cur.minXP
  const xpNeed = next.minXP - cur.minXP
  const pct   = cur.level === 7 ? 100 : Math.min((xpIn / xpNeed) * 100, 100)
  return { cur, next, xpIn, xpNeed, pct }
}

function calcXP(income: Income[], tasks: Task[]) {
  const iXP = income.reduce((s, i) => {
    if (i.amount >= 1000) return s + 150
    if (i.amount >= 500)  return s + 100
    if (i.amount >= 100)  return s + 50
    return s + 20
  }, 0)
  const tXP = tasks.filter(t => t.done).length * 15
  return iXP + tXP
}

// ─── Achievements ─────────────────────────────────────────────────────────────
const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_task',   name: 'First Step',     desc: 'Complete your first task',        Icon: CheckCircle2, color: C.green,  xpReward: 50,  check: (i, t) => t.filter(x => x.done).length >= 1 },
  { id: 'first_money',  name: 'First Blood',    desc: 'Log your first income',           Icon: DollarSign,   color: C.gold,   xpReward: 100, check: (i) => i.length >= 1 },
  { id: 'five_hundred', name: 'Money Bags',     desc: '$500+ in a single month',         Icon: TrendingUp,   color: C.green,  xpReward: 150, check: (i) => Object.values(i.reduce((a,x) => ({ ...a, [x.date.slice(0,7)]: (a[x.date.slice(0,7)] || 0) + x.amount }), {} as Record<string,number>)).some(v => v >= 500) },
  { id: 'thousand',     name: 'Four Figures',   desc: '$1,000+ in a single month',       Icon: BarChart3,    color: C.cyan,   xpReward: 200, check: (i) => Object.values(i.reduce((a,x) => ({ ...a, [x.date.slice(0,7)]: (a[x.date.slice(0,7)] || 0) + x.amount }), {} as Record<string,number>)).some(v => v >= 1000) },
  { id: 'double',       name: 'Double Down',    desc: 'Crush your doubling target',      Icon: Zap,          color: C.purple, xpReward: 250, check: (i) => Object.values(i.reduce((a,x) => ({ ...a, [x.date.slice(0,7)]: (a[x.date.slice(0,7)] || 0) + x.amount }), {} as Record<string,number>)).some(v => v >= 1440) },
  { id: 'two_k',        name: 'Big Moves',      desc: '$2,000+ in a single month',       Icon: Rocket,       color: C.pink,   xpReward: 300, check: (i) => Object.values(i.reduce((a,x) => ({ ...a, [x.date.slice(0,7)]: (a[x.date.slice(0,7)] || 0) + x.amount }), {} as Record<string,number>)).some(v => v >= 2000) },
  { id: 'three_5k',     name: 'On A Roll',      desc: '$3,500+ in a single month',       Icon: TrendingUp,   color: C.blue,   xpReward: 400, check: (i) => Object.values(i.reduce((a,x) => ({ ...a, [x.date.slice(0,7)]: (a[x.date.slice(0,7)] || 0) + x.amount }), {} as Record<string,number>)).some(v => v >= 3500) },
  { id: 'five_tasks',   name: 'In The Zone',    desc: 'Complete 5+ tasks in one day',    Icon: Target,       color: C.orange, xpReward: 100, check: (i, t) => { const by = t.filter(x => x.done).reduce((a, x) => ({ ...a, [x.date]: (a[x.date] || 0) + 1 }), {} as Record<string,number>); return Object.values(by).some(v => v >= 5) } },
  { id: 'week_streak',  name: 'Week Warrior',   desc: '7+ day task streak',              Icon: Flame,        color: C.orange, xpReward: 200, check: (i, t, s) => s >= 7 },
  { id: 'music_money',  name: 'Artist Rising',  desc: 'Earn from your Music mission',    Icon: Music,        color: C.purple, xpReward: 150, check: (i) => i.some(x => x.missionId === 'music') },
  { id: 'five_k',       name: 'High Roller',    desc: '$5,000+ in a single month',       Icon: Crown,        color: C.gold,   xpReward: 500, check: (i) => Object.values(i.reduce((a,x) => ({ ...a, [x.date.slice(0,7)]: (a[x.date.slice(0,7)] || 0) + x.amount }), {} as Record<string,number>)).some(v => v >= 5000) },
  { id: 'boss_month',   name: 'Boss Mode',      desc: '$10,000+ in a single month',      Icon: Shield,       color: C.pink,   xpReward: 1000, check: (i) => Object.values(i.reduce((a,x) => ({ ...a, [x.date.slice(0,7)]: (a[x.date.slice(0,7)] || 0) + x.amount }), {} as Record<string,number>)).some(v => v >= 10000) },
  { id: 'mic_check',    name: 'On The Mic',     desc: 'Book your first live show',       Icon: Mic2,         color: C.cyan,   xpReward: 300, check: (i) => i.some(x => x.source.toLowerCase().includes('show') || x.source.toLowerCase().includes('perform') || x.source.toLowerCase().includes('host')) },
]

// ─── Missions ─────────────────────────────────────────────────────────────────
const MISSIONS: Mission[] = [
  { id: 'music',      name: 'Music',       Icon: Music,     status: 'active',    color: C.purple, goal: 'Build music career in Vietnam — shows, club plays, brand sponsorships', timeline: '6-month mission' },
  { id: 'webdev',     name: 'Web Dev',     Icon: Monitor,   status: 'active',    color: C.blue,   goal: 'Land consistent clients to fund music launch and life',                  timeline: 'Ongoing engine' },
  { id: 'coffee',     name: 'Rujo Coffee', Icon: Coffee,    status: 'slow-burn', color: C.orange, goal: 'B2B premix sales — win Michelin star restaurant group, then scale',      timeline: 'Slow burn' },
  { id: 'modeling',   name: 'Modeling',    Icon: Camera,    status: 'passive',   color: C.pink,   goal: 'Comes through networking — let it come',                                 timeline: 'Passive' },
  { id: 'magicfresh', name: 'Magic Fresh', Icon: Sparkles,  status: 'passive',   color: C.green,  goal: 'Net that catches fish — wind down gracefully',                           timeline: 'Passive' },
  { id: 'property',   name: 'Matthews & Matthews', Icon: Building2, status: 'slow-burn', color: '#818CF8', goal: 'Help mentor stabilize her multi-million dollar property portfolio during family business transfer — the payday comes when she is back on top', timeline: 'Long play' },
]

const STATUS_CFG = {
  'active':    { label: 'Active',    color: C.green,  bg: 'rgba(52,211,153,0.12)'  },
  'slow-burn': { label: 'Slow Burn', color: C.orange, bg: 'rgba(251,146,60,0.12)'  },
  'passive':   { label: 'Passive',   color: C.muted,  bg: 'rgba(120,118,160,0.12)' },
}

// ─── Wisdom ───────────────────────────────────────────────────────────────────
const QUOTES: Quote[] = [
  { id: 'q1',  author: 'Ray Dalio',       tag: 'Growth',    text: 'Pain + Reflection = Progress.' },
  { id: 'q2',  author: 'Ray Dalio',       tag: 'Mindset',   text: 'Radical open-mindedness and radical transparency are invaluable. They allow you to be honest with yourself and others.' },
  { id: 'q3',  author: 'Ray Dalio',       tag: 'Growth',    text: "If you're not failing, you're not pushing your limits. And if you're not pushing your limits, you're not maximizing your potential." },
  { id: 'q4',  author: 'Ray Dalio',       tag: 'Mindset',   text: "Don't let fears of what others think of you stand in your way. Design your life the way you want it." },
  { id: 'q5',  author: 'Alex Hormozi',    tag: 'Money',     text: 'The only way to make more money is to provide more value. Period.' },
  { id: 'q6',  author: 'Alex Hormozi',    tag: 'Execution', text: 'Volume negates luck. You cannot control talent but you can control reps. Put in the reps.' },
  { id: 'q7',  author: 'Alex Hormozi',    tag: 'Money',     text: 'Make your offer so good that people feel stupid saying no.' },
  { id: 'q8',  author: 'Alex Hormozi',    tag: 'Growth',    text: 'Work so hard that you become the person who deserves what you want.' },
  { id: 'q9',  author: 'Alex Hormozi',    tag: 'Money',     text: 'The fastest way to make money is to solve expensive problems for people who can afford the solution.' },
  { id: 'q10', author: 'Naval Ravikant',  tag: 'Wealth',    text: 'Wealth is assets that earn while you sleep. Money is how we transfer time and wealth.' },
  { id: 'q11', author: 'Naval Ravikant',  tag: 'Focus',     text: 'The most important skill is knowing what to ignore.' },
  { id: 'q12', author: 'Naval Ravikant',  tag: 'Wealth',    text: 'Specific knowledge is knowledge you cannot be trained for. It is found by pursuing your genuine curiosity.' },
  { id: 'q13', author: 'Naval Ravikant',  tag: 'Mindset',   text: 'Play long-term games with long-term people. All returns in life come from compound interest.' },
  { id: 'q14', author: 'Kobe Bryant',     tag: 'Execution', text: 'Everything negative — pressure, challenges — is all an opportunity for me to rise.' },
  { id: 'q15', author: 'Kobe Bryant',     tag: 'Mindset',   text: "If you're afraid to fail, then you're probably going to fail. The greatest people are not afraid of failure." },
  { id: 'q16', author: 'Warren Buffett',  tag: 'Money',     text: 'Rule No. 1: Never lose money. Rule No. 2: Never forget Rule No. 1.' },
  { id: 'q17', author: 'Warren Buffett',  tag: 'Growth',    text: 'The best investment you can make is in yourself. The more you learn, the more you earn.' },
  { id: 'q18', author: 'Marcus Aurelius', tag: 'Mindset',   text: 'You have power over your mind, not outside events. Realize this and you will find strength.' },
  { id: 'q19', author: 'Marcus Aurelius', tag: 'Execution', text: 'The impediment to action advances action. What stands in the way becomes the way.' },
  { id: 'q20', author: 'Marcus Aurelius', tag: 'Focus',     text: 'Confine yourself to the present. Waste no more time arguing about what a good man should be. Be one.' },
  { id: 'q21', author: 'Nipsey Hussle',   tag: 'Execution', text: "The game is going to test you, never fold. Stay ten toes down." },
  { id: 'q22', author: 'Nipsey Hussle',   tag: 'Mindset',   text: 'Be the last person to accept defeat. Marathon mentality — always.' },
  { id: 'q23', author: 'Gary Vee',        tag: 'Execution', text: 'Macro patience, micro speed. Patient on the vision, fast on the execution.' },
  { id: 'q24', author: 'Gary Vee',        tag: 'Mindset',   text: 'Stop whining, start grinding. Ideas are worth nothing. Execution is everything.' },
  { id: 'q25', author: 'Andrew Tate',     tag: 'Execution', text: 'Speed is extremely important. React immediately. The man who hesitates is lost.' },
  { id: 'q26', author: 'Andrew Tate',     tag: 'Mindset',   text: 'The temporary satisfaction of comfort is the enemy of your dreams.' },
  { id: 'q27', author: 'Robert Greene',   tag: 'Strategy',  text: 'Mastery is not a function of genius or talent. It is a function of time and intense focus.' },
  { id: 'q28', author: 'Robert Greene',   tag: 'Strategy',  text: 'The best way to move forward is to have clear goals and focus your energy like a laser.' },
]

// ─── Seed data ────────────────────────────────────────────────────────────────
const SEED_INCOME: Income[] = [
  { id: 'may1', source: 'C4 Website',             missionId: 'webdev',     amount: 125,  date: '2026-05-10' },
  { id: 'may2', source: 'Liz',                    missionId: 'magicfresh', amount: 140,  date: '2026-05-12' },
  { id: 'may3', source: 'Brand Posts',            missionId: 'webdev',     amount: 80,   date: '2026-05-15' },
  { id: 'may4', source: 'Novos Work',             missionId: 'webdev',     amount: 175,  date: '2026-05-20' },
  { id: 'may5', source: 'Nomaly Website',         missionId: 'webdev',     amount: 200,  date: '2026-05-25' },
  { id: 'jun0', source: 'VBS (AI Data Training)', missionId: 'webdev',     amount: 1400, date: '2026-06-02' },
  { id: 'jun1', source: 'Liz (cleaning)',         missionId: 'magicfresh', amount: 140,  date: '2026-06-05' },
  { id: 'jun2', source: 'Novos',                  missionId: 'webdev',     amount: 150,  date: '2026-06-08' },
  { id: 'jun3', source: 'Nomaly Website',         missionId: 'webdev',     amount: 150,  date: '2026-06-12' },
  { id: 'jun4', source: 'Ultraviolet Website',    missionId: 'webdev',     amount: 80,   date: '2026-06-18' },
  { id: 'jun5', source: 'RVB Website',            missionId: 'webdev',     amount: 750,  date: '2026-06-27' },
  { id: 'jun6', source: 'CW Soundlab Website',    missionId: 'webdev',     amount: 100,  date: '2026-06-20' },
]
const SEED_EXPENSES: Expense[] = [
  { id: 'me1', category: 'Rent',            amount: 132, date: '2026-05-01' },
  { id: 'me2', category: 'Donte Debt',      amount: 90,  date: '2026-05-01' },
  { id: 'me3', category: 'Storage',         amount: 19,  date: '2026-05-01' },
  { id: 'me4', category: 'Food',            amount: 250, date: '2026-05-15' },
  { id: 'me5', category: 'Transportation',  amount: 38,  date: '2026-05-20' },
  { id: 'me6', category: 'Claude',          amount: 20,  date: '2026-05-01' },
  { id: 'me7', category: 'Misc',            amount: 20,  date: '2026-05-25' },
  { id: 'je1', category: 'Rent',            amount: 340, date: '2026-06-01' },
  { id: 'je2', category: 'Donte Debt',      amount: 50,  date: '2026-06-01' },
  { id: 'je3', category: 'Storage',         amount: 19,  date: '2026-06-01' },
  { id: 'je4', category: 'Food',            amount: 250, date: '2026-06-15' },
  { id: 'je5', category: 'Motorbike',       amount: 53,  date: '2026-06-10' },
  { id: 'je6', category: 'Claude',          amount: 20,  date: '2026-06-01' },
  { id: 'je7', category: 'Misc',            amount: 150, date: '2026-06-20' },
  { id: 'je8', category: 'Clothes',         amount: 238, date: '2026-06-22' },
]

const SEED_NOTES: Notes = {
  music: `PLAN: Record → shoot video → get DJ friends to spin in clubs → run ads → show income → land brand deals.

ACTION STEPS:
1. Record your song (it's done) — mix/master this week
2. Shoot a cinematic music video — one good location, one good camera
3. Send the track to 3 DJ friends — ask them to play it at upcoming gigs
4. Post short-form clips on TikTok + Instagram Reels weekly
5. Run YouTube ads to boost video views (start at $5/day)
6. Run Spotify growth ads to hit 10k monthly listeners
7. With proof of traction — approach clothing/drink/lifestyle brands

INCOME TARGETS:
- Month 3: first paid show ($200+)
- Month 5: brand sponsorship deal ($500+)
- Month 6: consistent show bookings`,

  webdev: `PLAN: Run Facebook ads targeting Vietnamese businesses who need websites — 48-hour delivery angle.

PRICING (VND):
- Starter: 3,000,000 VND (~$120) — 1-page site, fast delivery
- Business: 5,000,000 VND (~$200) — 5 pages, SEO, contact form
- Premium: 9,000,000 VND (~$360) — full brand + social setup

AD ANGLE: "Get a professional website for your business in 48 hours — guaranteed."
TARGET: Restaurants, salons, gyms, retail shops in Ho Chi Minh City

CLIENT COMMS: Use Zalo (not WhatsApp) — it's the dominant messaging app in Vietnam
REFERRALS: Ask every client for one introduction to another business owner

INCOME TARGETS:
- 2 websites/week = $400–800/week
- July: close 4 pending sites = $1,600 locked in`,

  coffee: `PLAN: B2B premix sales — target high-end restaurants first, then scale once one big name is in.

ACTION STEPS:
1. Create a Facebook Business Page for Rujo Coffee
2. Identify Michelin-listed or 5-star hotel restaurants in Vietnam
3. Contact via Zalo with a sample offer (1 free bag to try)
4. Follow up within 3 days — ask for a 3-month supply order
5. One major restaurant win = credibility to land more

SLOW BURN STRATEGY:
Don't chase volume — one premium client validates the brand.
Do this on the side while web dev pays the bills.`,

  modeling: `STRATEGY: Let it come through networking. Don't actively pursue — it's already passive income.

When opportunities arise:
- Always say yes to paid shoots
- Keep LinkedIn + Instagram updated with clean shots
- Mention modeling availability to brands you already work with on web/music`,

  property: `SITUATION: Mentor runs a multi-million dollar property management company. Family business is being transferred to her and things got disorganized. You stepped in to help her get back on top.

WHY THIS MATTERS:
- She is a high-value connection — one deal or referral from her network changes everything
- When the company is stabilized, you are positioned as the trusted person who held it together
- Think: consulting fees, equity discussions, property management cuts, or referrals to her network

ACTION STEPS:
1. Get a clear picture of all properties — create a simple master spreadsheet (address, tenant, lease date, rent amount, outstanding issues)
2. Identify the 3 most urgent problems (missed rent, maintenance backlog, missing paperwork) and tackle those first
3. Set up a weekly check-in rhythm with her so she stays informed and you stay involved
4. Document everything you do — this builds your case for compensation later
5. Once things are stable, have the honest conversation: "Here's what I've done — how do we structure this going forward?"

LONG GAME: Don't rush the money conversation. The value you are building right now is trust at the highest level. That is worth more than a quick fee.`,

  magicfresh: `STRATEGY: Wind down gracefully. Don't add more time or money.

- Service existing clients (Liz, Novos) while it runs
- Don't advertise or take new cleaning jobs
- If a referral comes in for big $, assess case by case
- Redirect energy to Web Dev + Music`,
}

// ─── Utils ────────────────────────────────────────────────────────────────────
const todayStr  = () => new Date().toISOString().split('T')[0]
const monthStr  = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
const usd       = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n)
const uid       = () => Date.now().toString(36) + Math.random().toString(36).slice(2)
const doy       = () => Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)

function useLS<T>(key: string, init: T): [T, (v: T | ((p: T) => T)) => void] {
  const [state, setState] = useState<T>(init)
  const ready = useRef(false)
  useEffect(() => {
    if (ready.current) return
    ready.current = true
    try { const r = localStorage.getItem(key); if (r) setState(JSON.parse(r)) } catch {}
  }, [key])
  const set = useCallback((v: T | ((p: T) => T)) => {
    setState(prev => {
      const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v
      localStorage.setItem(key, JSON.stringify(next))
      return next
    })
  }, [key])
  return [state, set]
}

// ─── Primitive components ─────────────────────────────────────────────────────
function Card({ children, className = '', style = {}, glow = false }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; glow?: boolean }) {
  return (
    <div
      className={`rounded-2xl ${glow ? 'glow-pulse' : ''} ${className}`}
      style={{ background: C.card, border: `1px solid ${C.border}`, ...style }}
    >
      {children}
    </div>
  )
}

function GradCard({ children, from, to, className = '' }: { children: React.ReactNode; from: string; to: string; className?: string }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`, border: `1px solid ${from}50` }}
    >
      {children}
    </div>
  )
}

function SLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: C.faint }}>{children}</p>
}

function HBar({ label, value, max, from, to, sub }: { label: string; value: number; max: number; from: string; to: string; sub?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-sm font-medium" style={{ color: C.text }}>{label}</span>
        <div>
          <span className="text-sm font-bold" style={{ color: from }}>{usd(value)}</span>
          {sub && <span className="text-[11px] ml-1" style={{ color: C.muted }}>{sub}</span>}
        </div>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: C.faint + '50' }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${from}, ${to})` }} />
      </div>
    </div>
  )
}

// ─── ACHIEVEMENTS CARD ────────────────────────────────────────────────────────
function AchievementsCard({ income, tasks, streak, unlockedCount }: { income: Income[]; tasks: Task[]; streak: number; unlockedCount: number }) {
  const [active, setActive] = useState<string | null>(null)
  const activeAch = ACHIEVEMENTS.find(a => a.id === active)
  const activeUnlocked = activeAch ? activeAch.check(income, tasks, streak) : false

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy size={13} style={{ color: C.gold }} />
          <SLabel>Achievements</SLabel>
        </div>
        <span className="text-[10px] font-semibold" style={{ color: C.muted }}>{unlockedCount}/{ACHIEVEMENTS.length}</span>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {ACHIEVEMENTS.map(a => {
          const unlocked = a.check(income, tasks, streak)
          const isActive = active === a.id
          return (
            <button
              key={a.id}
              onClick={() => setActive(isActive ? null : a.id)}
              onMouseEnter={() => setActive(a.id)}
              onMouseLeave={() => setActive(null)}
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${unlocked ? 'badge-pop' : ''}`}
              style={{
                background: isActive ? (unlocked ? `${a.color}35` : C.faint + '40') : unlocked ? `${a.color}20` : C.card2,
                border: `1.5px solid ${isActive ? (a.color + '80') : unlocked ? a.color + '50' : C.faint + '30'}`,
                opacity: unlocked ? 1 : 0.4,
                transform: isActive ? 'scale(1.1)' : 'scale(1)',
              }}
            >
              {unlocked ? <a.Icon size={16} style={{ color: a.color }} /> : <Lock size={12} style={{ color: C.faint }} />}
            </button>
          )
        })}
      </div>

      {activeAch && (
        <div className="rounded-xl p-3 slide-up" style={{ background: activeUnlocked ? `${activeAch.color}12` : C.card2, border: `1px solid ${activeUnlocked ? activeAch.color + '40' : C.border}` }}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <activeAch.Icon size={14} style={{ color: activeUnlocked ? activeAch.color : C.faint }} />
              <span className="text-sm font-bold" style={{ color: activeUnlocked ? activeAch.color : C.muted }}>{activeAch.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${C.gold}15`, color: C.gold }}>+{activeAch.xpReward} XP</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: activeUnlocked ? `${activeAch.color}20` : C.faint + '20', color: activeUnlocked ? activeAch.color : C.faint }}>{activeUnlocked ? 'Unlocked' : 'Locked'}</span>
            </div>
          </div>
          <p className="text-xs" style={{ color: C.muted }}>{activeAch.desc}</p>
        </div>
      )}

      {!activeAch && <p className="text-[10px]" style={{ color: C.faint }}>Tap any badge to see details.</p>}
    </Card>
  )
}

// ─── HUB (Overview) ───────────────────────────────────────────────────────────
function Hub({ income, tasks, expenses, streak }: { income: Income[]; tasks: Task[]; expenses: Expense[]; streak: number }) {
  const cm      = monthStr()
  const now     = new Date()
  const total   = income.filter(i => i.date.startsWith(cm)).reduce((s, i) => s + i.amount, 0)
  const mExp    = expenses.filter(e => e.date.startsWith(cm)).reduce((s, e) => s + e.amount, 0)
  const prevM   = monthStr(new Date(now.getFullYear(), now.getMonth() - 1))
  const prevT   = income.filter(i => i.date.startsWith(prevM)).reduce((s, i) => s + i.amount, 0)
  const GOAL    = prevT > 0 ? prevT * 2 : 1440
  const pct     = Math.min((total / GOAL) * 100, 100)

  const xp      = calcXP(income, tasks)
  const lvl     = getLevel(xp)

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dayOf       = now.getDate()
  const projected   = dayOf > 0 ? Math.round((total / dayOf) * daysInMonth) : 0

  const todayTasks = tasks.filter(t => t.date === todayStr())
  const doneTasks  = todayTasks.filter(t => t.done).length

  const unlockedAch = ACHIEVEMENTS.filter(a => a.check(income, tasks, streak))
  const todayQuote  = QUOTES[doy() % QUOTES.length]

  const recent = [...income].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4)

  return (
    <div className="space-y-4 slide-up">

      {/* Character card */}
      <div
        className="rounded-2xl p-5 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.12) 0%, rgba(34,211,238,0.06) 100%)', border: `1px solid ${C.purple}30` }}
      >
        {/* Background glow orbs */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10 float" style={{ background: `radial-gradient(circle, ${C.purple}, transparent)` }} />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full opacity-8" style={{ background: `radial-gradient(circle, ${C.cyan}, transparent)` }} />

        <div className="relative">
          {/* Top row: name + streak */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: C.purple }}>Mission Control</p>
              <h1 className="sg text-2xl font-bold" style={{ color: C.text }}>Joshua Porter</h1>
            </div>
            {streak > 0 && (
              <div className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl" style={{ background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.25)' }}>
                <Flame size={18} style={{ color: C.orange }} />
                <span className="text-lg font-bold streak-text" style={{ color: C.orange }}>{streak}</span>
                <span className="text-[9px] font-semibold" style={{ color: C.muted }}>STREAK</span>
              </div>
            )}
          </div>

          {/* Level badge */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${lvl.cur.color}20`, border: `1.5px solid ${lvl.cur.color}50` }}>
              <span className="sg text-base font-bold" style={{ color: lvl.cur.color }}>{lvl.cur.level}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="sg text-sm font-bold shimmer-text">{lvl.cur.name.toUpperCase()}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: `${lvl.cur.color}20`, color: lvl.cur.color }}>LVL {lvl.cur.level}</span>
              </div>
              <p className="text-[11px]" style={{ color: C.muted }}>{xp} XP · {Math.round(lvl.pct)}% to {lvl.next.name}</p>
            </div>
          </div>

          {/* XP bar */}
          <div className="mb-4">
            <div className="h-2 rounded-full overflow-hidden" style={{ background: C.faint + '40' }}>
              <div className="h-full rounded-full xp-bar" style={{ width: `${lvl.pct}%`, background: `linear-gradient(90deg, ${lvl.cur.color}, ${lvl.next.color})` }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px]" style={{ color: C.faint }}>{lvl.xpIn} XP</span>
              <span className="text-[10px]" style={{ color: C.faint }}>{lvl.xpNeed} to next</span>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Earned', value: usd(total), color: C.gold   },
              { label: 'Profit', value: usd(total - mExp), color: total - mExp >= 0 ? C.green : C.red },
              { label: 'Quests', value: `${doneTasks}/${todayTasks.length}`, color: C.cyan },
            ].map(s => (
              <div key={s.label} className="text-center py-2 rounded-xl" style={{ background: C.card2 }}>
                <p className="text-sm font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[9px] font-semibold mt-0.5" style={{ color: C.muted }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main quest */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Crown size={13} style={{ color: C.gold }} />
          <SLabel>Main Quest — July</SLabel>
        </div>
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-3xl sg font-bold" style={{ color: C.text }}>{usd(total)}</p>
            <p className="text-xs mt-0.5" style={{ color: C.muted }}>of <span style={{ color: C.gold }}>{usd(GOAL)}</span> goal · projecting {usd(projected)}</p>
          </div>
          <p className="text-xl font-bold" style={{ color: pct >= 100 ? C.green : pct >= 70 ? C.gold : C.purple }}>{Math.round(pct)}%</p>
        </div>
        <div className="h-4 rounded-full overflow-hidden relative" style={{ background: C.faint + '30' }}>
          <div
            className="h-full rounded-full transition-all duration-700 relative"
            style={{ width: `${pct}%`, background: pct >= 100 ? `linear-gradient(90deg, ${C.green}, ${C.cyan})` : `linear-gradient(90deg, ${C.gold}, ${C.orange})` }}
          >
            <div className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%)' }} />
          </div>
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px]" style={{ color: C.muted }}>Day {dayOf}/{daysInMonth}</span>
          <span className="text-[10px]" style={{ color: pct >= 100 ? C.green : C.muted }}>{usd(Math.max(GOAL - total, 0))} remaining</span>
        </div>
      </Card>

      {/* Achievements */}
      <AchievementsCard income={income} tasks={tasks} streak={streak} unlockedCount={unlockedAch.length} />

      {/* Recent loot */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <Coins size={13} style={{ color: C.green }} />
          <SLabel>Recent Loot</SLabel>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: C.faint }}>No income logged yet.</p>
        ) : (
          <div className="space-y-1">
            {recent.map(entry => {
              const m = MISSIONS.find(x => x.id === entry.missionId)
              return (
                <div key={entry.id} className="flex items-center justify-between py-2.5 border-b last:border-0" style={{ borderColor: C.border }}>
                  <div className="flex items-center gap-2.5">
                    {m && <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${m.color}18` }}><m.Icon size={13} style={{ color: m.color }} /></div>}
                    <div>
                      <p className="text-sm font-medium" style={{ color: C.text }}>{entry.source}</p>
                      <p className="text-[11px]" style={{ color: C.muted }}>{entry.date}</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold" style={{ color: C.green }}>+{usd(entry.amount)}</p>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Daily principle */}
      <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.08) 0%, rgba(34,211,238,0.04) 100%)', border: `1px solid ${C.purple}25` }}>
        <div className="flex items-center gap-1.5 mb-3">
          <BookOpen size={12} style={{ color: C.purple }} />
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: C.purple }}>Today's Principle</p>
        </div>
        <p className="text-sm font-medium leading-relaxed" style={{ color: C.text }}>"{todayQuote.text}"</p>
        <p className="text-xs mt-2 font-semibold" style={{ color: C.muted }}>— {todayQuote.author}</p>
      </div>
    </div>
  )
}

// ─── STATS ────────────────────────────────────────────────────────────────────
function Stats({ income, expenses }: { income: Income[]; expenses: Expense[] }) {
  const now = new Date()
  const cm  = monthStr()

  const MONTH_KEYS = [
    { key: '2026-05', label: 'May',  from: C.blue,   to: C.purple },
    { key: '2026-06', label: 'June', from: C.purple,  to: C.cyan  },
    { key: '2026-07', label: 'July', from: C.gold,    to: C.orange },
  ]

  const mData = MONTH_KEYS.map((m, i) => {
    const inc = income.filter(e => e.date.startsWith(m.key)).reduce((s, e) => s + e.amount, 0)
    const exp = expenses.filter(e => e.date.startsWith(m.key)).reduce((s, e) => s + e.amount, 0)
    const prevInc = i === 0 ? 0 : income.filter(e => e.date.startsWith(MONTH_KEYS[i - 1].key)).reduce((s, e) => s + e.amount, 0)
    const target = i === 0 ? 720 : prevInc * 2
    return { ...m, income: inc, expenses: exp, profit: inc - exp, target }
  })

  const maxBar = Math.max(...mData.map(m => Math.max(m.income, m.target))) * 1.15 || 5000

  const cmInc  = income.filter(i => i.date.startsWith(cm))
  const cmTotal = cmInc.reduce((s, i) => s + i.amount, 0)
  const cmExp  = expenses.filter(e => e.date.startsWith(cm))
  const cmExpT = cmExp.reduce((s, e) => s + e.amount, 0)

  const byMission = MISSIONS.map(m => ({
    ...m, total: cmInc.filter(i => i.missionId === m.id).reduce((s, i) => s + i.amount, 0),
  })).filter(m => m.total > 0).sort((a, b) => b.total - a.total)

  const byExpCat = Object.entries(
    cmExp.reduce((acc, e) => ({ ...acc, [e.category]: (acc[e.category] || 0) + e.amount }), {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1])

  const dayOf   = now.getDate()
  const daysInM = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const projected = dayOf > 0 ? Math.round((cmTotal / dayOf) * daysInM) : 0

  return (
    <div className="space-y-4 slide-up">

      {/* Boss Battle: Doubling Challenge */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-5">
          <Shield size={14} style={{ color: C.purple }} />
          <SLabel>Boss Battle — Doubling Challenge</SLabel>
        </div>

        {/* Vertical bars */}
        <div className="flex items-end gap-3 mb-6" style={{ height: 140 }}>
          {mData.map(m => (
            <div key={m.key} className="flex-1 flex flex-col items-center">
              <p className="text-[11px] font-bold mb-1" style={{ color: m.income > 0 ? C.text : C.faint }}>
                {m.income > 0 ? usd(m.income) : '—'}
              </p>
              <div className="w-full flex items-end gap-1" style={{ height: 100 }}>
                <div
                  className="flex-1 rounded-t-xl transition-all duration-700 relative overflow-hidden"
                  style={{ height: m.income > 0 ? `${Math.max((m.income / maxBar) * 100, 4)}%` : '4px', background: m.income > 0 ? `linear-gradient(180deg, ${m.from}, ${m.to})` : C.faint + '30', minHeight: 4 }}
                >
                  {m.income > 0 && <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 60%)' }} />}
                </div>
                <div className="w-2 rounded-t-lg" style={{ height: `${(m.target / maxBar) * 100}%`, background: `${m.from}20`, border: `1.5px dashed ${m.from}60` }} />
              </div>
              <p className="text-[11px] font-semibold mt-2" style={{ color: C.muted }}>{m.label}</p>
            </div>
          ))}
        </div>

        {/* Progress rows */}
        <div className="space-y-3">
          {mData.map(m => {
            const pct = m.target > 0 ? (m.income / m.target) * 100 : 0
            const hit  = pct >= 100
            const near = pct >= 80
            return (
              <div key={m.key} className="flex items-center gap-3">
                <span className="text-xs font-semibold w-10" style={{ color: C.muted }}>{m.label}</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: C.faint + '40' }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: `linear-gradient(90deg, ${m.from}, ${m.to})` }} />
                </div>
                <span className="text-xs font-semibold w-20 text-right" style={{ color: m.income > 0 ? C.text : C.faint }}>
                  {m.income > 0 ? usd(m.income) : `Goal: ${usd(m.target)}`}
                </span>
                {m.income > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md w-10 text-center" style={{ color: hit ? C.green : near ? C.gold : C.red, background: hit ? 'rgba(52,211,153,0.12)' : near ? 'rgba(251,191,36,0.12)' : 'rgba(248,113,113,0.12)' }}>
                    {Math.round(pct)}%
                  </span>
                )}
              </div>
            )
          })}
        </div>
        <p className="text-[10px] mt-4 pt-3 border-t" style={{ color: C.faint, borderColor: C.border }}>Solid = actual · Dashed = target</p>
      </Card>

      {/* Current pace */}
      <Card className="p-5">
        <SLabel>Current Month Pace</SLabel>
        <div className="grid grid-cols-3 gap-3">
          {[
            { l: 'Collected', v: usd(cmTotal),    c: C.green  },
            { l: 'Projected', v: usd(projected),  c: C.cyan   },
            { l: 'Expenses',  v: usd(cmExpT),     c: C.red    },
          ].map(s => (
            <div key={s.l} className="text-center py-3 rounded-xl" style={{ background: C.card2 }}>
              <p className="text-base font-bold" style={{ color: s.c }}>{s.v}</p>
              <p className="text-[10px] mt-0.5" style={{ color: C.muted }}>{s.l}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Income by mission */}
      {byMission.length > 0 && (
        <Card className="p-5">
          <SLabel>Income by Mission</SLabel>
          {byMission.map(m => <HBar key={m.id} label={m.name} value={m.total} max={cmTotal} from={m.color} to={m.color + 'CC'} sub={`${Math.round((m.total / cmTotal) * 100)}%`} />)}
        </Card>
      )}

      {/* P&L */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { l: 'Income',   v: cmTotal,           c: C.green, Icon: TrendingUp   },
          { l: 'Expenses', v: cmExpT,             c: C.red,   Icon: TrendingDown },
          { l: 'Profit',   v: cmTotal - cmExpT,   c: cmTotal - cmExpT >= 0 ? C.gold : C.red, Icon: DollarSign },
        ].map(({ l, v, c, Icon }) => (
          <Card key={l} className="p-4 text-center">
            <Icon size={15} className="mx-auto mb-1.5" style={{ color: c }} />
            <p className="text-sm font-bold" style={{ color: c }}>{usd(v)}</p>
            <p className="text-[10px] mt-0.5" style={{ color: C.faint }}>{l}</p>
          </Card>
        ))}
      </div>

      {/* Expense breakdown */}
      {byExpCat.length > 0 && (
        <Card className="p-5">
          <SLabel>Expense Breakdown</SLabel>
          {byExpCat.map(([cat, amt]) => <HBar key={cat} label={cat} value={amt} max={cmExpT} from={C.red} to={C.pink} sub={`${Math.round((amt / cmExpT) * 100)}%`} />)}
        </Card>
      )}
    </div>
  )
}

// ─── QUESTS (Tasks) ───────────────────────────────────────────────────────────
function Quests({ tasks, setTasks, streak, setStreak }: { tasks: Task[]; setTasks: (v: Task[] | ((p: Task[]) => Task[])) => void; streak: number; setStreak: (v: number | ((p: number) => number)) => void }) {
  const [newTask,    setNewTask]    = useState('')
  const [mFilter,   setMFilter]    = useState('all')
  const [missionId, setMissionId]  = useState('music')
  const ref = useRef<HTMLInputElement>(null)

  const today      = todayStr()
  const todayTasks = tasks.filter(t => t.date === today)
  const filtered   = mFilter === 'all' ? todayTasks : todayTasks.filter(t => t.missionId === mFilter)
  const done       = todayTasks.filter(t => t.done).length
  const pct        = todayTasks.length > 0 ? (done / todayTasks.length) * 100 : 0
  const xpToday    = done * 15

  const add = () => {
    const text = newTask.trim()
    if (!text) return
    setTasks(p => [...p, { id: uid(), missionId, text, done: false, date: today }])
    setNewTask('')
    ref.current?.focus()
  }

  const toggle = (id: string) => {
    setTasks(p => p.map(t => {
      if (t.id !== id) return t
      if (!t.done) setStreak(s => s) // Keep streak going
      return { ...t, done: !t.done }
    }))
  }

  return (
    <div className="space-y-4 slide-up">
      {/* Quest status */}
      <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(34,211,238,0.08) 0%, rgba(167,139,250,0.04) 100%)', border: `1px solid ${C.cyan}25` }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: C.cyan }}>Daily Quests</p>
            <p className="sg text-2xl font-bold" style={{ color: C.text }}>{done}<span className="text-base" style={{ color: C.faint }}>/{todayTasks.length}</span></p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold" style={{ color: C.gold }}>+{xpToday} XP</p>
            <p className="text-[11px]" style={{ color: C.muted }}>earned today</p>
          </div>
        </div>
        {todayTasks.length > 0 && (
          <div className="h-2 rounded-full overflow-hidden" style={{ background: C.faint + '40' }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: pct === 100 ? `linear-gradient(90deg, ${C.green}, ${C.cyan})` : `linear-gradient(90deg, ${C.purple}, ${C.cyan})` }} />
          </div>
        )}
      </div>

      <Card className="p-5">
        {/* Mission filter chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {['all', ...MISSIONS.map(m => m.id)].map(id => {
            const m = MISSIONS.find(x => x.id === id)
            const active = mFilter === id
            return (
              <button
                key={id}
                onClick={() => setMFilter(id)}
                className="text-xs px-3 py-1 rounded-full font-semibold transition-all"
                style={{ background: active ? (m?.color ?? C.purple) + '20' : C.card2, color: active ? (m?.color ?? C.purple) : C.muted, border: `1px solid ${active ? (m?.color ?? C.purple) + '40' : C.border}` }}
              >
                {id === 'all' ? 'All' : m?.name}
              </button>
            )
          })}
        </div>

        {/* Add task */}
        <div className="flex gap-2 mb-3">
          <input
            ref={ref}
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            placeholder="Add a quest..."
            className="flex-1 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
            style={{ background: C.card2, border: `1px solid ${C.border}`, color: C.text }}
          />
          <button onClick={add} className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.cyan})` }}>
            <Plus size={16} color="#fff" />
          </button>
        </div>
        <select
          value={missionId}
          onChange={e => setMissionId(e.target.value)}
          className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
          style={{ background: C.card2, border: `1px solid ${C.border}`, color: C.text }}
        >
          {MISSIONS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </Card>

      {/* Task list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card className="p-10 text-center">
            <p className="text-sm" style={{ color: C.faint }}>No quests today. Accept one below or add your own.</p>
          </Card>
        ) : (
          [...filtered].sort((a, b) => Number(a.done) - Number(b.done)).map(task => {
            const m = MISSIONS.find(x => x.id === task.missionId)
            return (
              <div
                key={task.id}
                className="rounded-xl px-4 py-3 group"
                style={{ background: task.done ? C.card2 : C.card, border: `1px solid ${task.done ? C.faint + '30' : C.border}`, opacity: task.done ? 0.6 : 1 }}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggle(task.id)}
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                    style={{ borderColor: task.done ? m?.color ?? C.purple : C.faint, background: task.done ? m?.color : 'transparent' }}
                  >
                    {task.done && <Check size={10} color="#fff" strokeWidth={3} />}
                  </button>
                  <span className="flex-1 text-sm" style={{ color: task.done ? C.muted : C.text, textDecoration: task.done ? 'line-through' : 'none' }}>
                    {task.text}
                  </span>
                  {!task.done && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ color: C.gold, background: 'rgba(251,191,36,0.1)' }}>+15 XP</span>}
                  {m && <m.Icon size={13} style={{ color: m.color, opacity: task.done ? 0.3 : 0.7 }} />}
                  <button onClick={() => setTasks(p => p.filter(t => t.id !== task.id))} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: C.faint }}><X size={14} /></button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Strategy Quest Bank */}
      <SuggestedQuests
        today={today}
        todayTasks={todayTasks}
        onAccept={(q) => setTasks(p => [...p, { id: uid(), missionId: q.missionId, text: q.text, done: false, date: today }])}
      />
    </div>
  )
}

function SuggestedQuests({ today, todayTasks, onAccept }: {
  today: string
  todayTasks: Task[]
  onAccept: (q: { text: string; missionId: string }) => void
}) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('all')

  const accepted = new Set(todayTasks.map(t => t.text))
  const visible = QUEST_TEMPLATES.filter(q => filter === 'all' || q.missionId === filter)

  return (
    <Card className="p-4">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Rocket size={14} style={{ color: C.purple }} />
          <p className="text-sm font-bold" style={{ color: C.text }}>Strategy Quest Bank</p>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${C.purple}15`, color: C.purple }}>{QUEST_TEMPLATES.length} quests</span>
        </div>
        <ChevronDown size={14} style={{ color: C.muted, transform: open ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
      </button>

      {open && (
        <div className="mt-3 slide-up">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {['all', 'webdev', 'music', 'coffee', 'property'].map(id => {
              const m = MISSIONS.find(x => x.id === id)
              const active = filter === id
              return (
                <button
                  key={id}
                  onClick={() => setFilter(id)}
                  className="text-[11px] px-2.5 py-1 rounded-full font-semibold"
                  style={{ background: active ? (m?.color ?? C.purple) + '20' : C.card2, color: active ? (m?.color ?? C.purple) : C.muted, border: `1px solid ${active ? (m?.color ?? C.purple) + '40' : C.border}` }}
                >
                  {id === 'all' ? 'All' : m?.name}
                </button>
              )
            })}
          </div>
          <div className="space-y-2">
            {visible.map((q, i) => {
              const m = MISSIONS.find(x => x.id === q.missionId)
              const done = accepted.has(q.text)
              return (
                <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: C.card2, border: `1px solid ${done ? C.green + '30' : C.border}`, opacity: done ? 0.5 : 1 }}>
                  {m && <m.Icon size={13} style={{ color: m.color, flexShrink: 0 }} />}
                  <span className="flex-1 text-xs" style={{ color: done ? C.muted : C.text, textDecoration: done ? 'line-through' : 'none' }}>{q.text}</span>
                  {done
                    ? <CheckCircle2 size={14} style={{ color: C.green, flexShrink: 0 }} />
                    : <button onClick={() => onAccept(q)} className="text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0" style={{ background: `${m?.color ?? C.purple}20`, color: m?.color ?? C.purple }}>Accept</button>
                  }
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Card>
  )
}

// ─── MISSIONS ─────────────────────────────────────────────────────────────────
const QUEST_TEMPLATES: { text: string; missionId: string }[] = [
  // Web Dev — client acquisition
  { text: 'Follow up on all 4 pending website contracts', missionId: 'webdev' },
  { text: 'Set up Facebook Business Page for web dev services', missionId: 'webdev' },
  { text: 'Write ad copy: "Professional website in 48 hours"', missionId: 'webdev' },
  { text: 'Launch $5/day Facebook ad targeting HCMC businesses', missionId: 'webdev' },
  { text: 'Message 3 business leads on Zalo today', missionId: 'webdev' },
  { text: 'Ask last client for 1 referral introduction', missionId: 'webdev' },
  { text: 'Send maintenance upsell offer to Novos or Nomaly', missionId: 'webdev' },
  { text: 'Post a before/after website screenshot on Facebook', missionId: 'webdev' },
  // Music
  { text: 'Send track to 1 DJ friend to spin at their next gig', missionId: 'music' },
  { text: 'Film a short clip for TikTok / Instagram Reels', missionId: 'music' },
  { text: 'Research YouTube ad setup for music video promotion', missionId: 'music' },
  { text: 'Finish mix/master on current song', missionId: 'music' },
  { text: 'Scout 1 filming location for music video', missionId: 'music' },
  { text: 'Reach out to a local brand about future sponsorship', missionId: 'music' },
  // Coffee
  { text: 'Create Rujo Coffee Facebook Business Page', missionId: 'coffee' },
  { text: 'List 5 Michelin / high-end restaurants to pitch', missionId: 'coffee' },
  { text: 'Send Zalo sample offer to 1 restaurant manager', missionId: 'coffee' },
  { text: 'Follow up on any outstanding Rujo leads', missionId: 'coffee' },
  // Property Management
  { text: 'Build master property spreadsheet (address, tenant, rent, lease date)', missionId: 'property' },
  { text: 'Identify top 3 urgent issues in the portfolio', missionId: 'property' },
  { text: 'Check in with mentor — what does she need this week?', missionId: 'property' },
  { text: 'Document all work done on the portfolio this week', missionId: 'property' },
  { text: 'Flag any tenants with overdue rent or expiring leases', missionId: 'property' },
]

const INCOME_BOOSTS: { title: string; desc: string; impact: string; color: string }[] = [
  { title: 'Run Facebook Ads in Vietnam', desc: 'Target HCMC businesses with "professional website in 48 hours" angle. $5–10/day budget, Zalo CTA.', impact: '+$400–800/wk', color: C.blue },
  { title: 'Ask Every Client for a Referral', desc: 'After delivery, text: "Do you know one business owner who needs a website?" One ask = one new client.', impact: '+$200–360/referral', color: C.purple },
  { title: 'Upsell Existing Clients', desc: 'Novos, Nomaly, Ultraviolet — offer monthly maintenance at $50–100/mo. Recurring without extra work.', impact: '+$150–300/mo passive', color: C.cyan },
  { title: 'Post Content on Zalo & Facebook', desc: 'Share before/after website screenshots daily. Vietnamese business owners trust social proof.', impact: 'Inbound leads', color: C.green },
  { title: 'Pitch 1 Coffee Restaurant This Week', desc: 'Send Rujo samples to 1 Michelin/5-star restaurant via Zalo. One big win unlocks the brand.', impact: 'B2B contract', color: C.orange },
]

function Missions({ income, notes, setNotes }: { income: Income[]; notes: Notes; setNotes: (v: Notes | ((p: Notes) => Notes)) => void }) {
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [showBoosts, setShowBoosts] = useState(false)

  const now   = new Date()
  const prevM = monthStr(new Date(now.getFullYear(), now.getMonth() - 1))
  const prevT = income.filter(i => i.date.startsWith(prevM)).reduce((s, i) => s + i.amount, 0)
  const GOAL  = prevT > 0 ? prevT * 2 : 1440
  const cm    = monthStr()
  const cmLabel = new Date(now.getFullYear(), now.getMonth()).toLocaleString('default', { month: 'long' })
  const prevLabel = new Date(now.getFullYear(), now.getMonth() - 1).toLocaleString('default', { month: 'long' })

  return (
    <div className="space-y-4 slide-up">
      <div className="rounded-2xl p-4" style={{ background: `linear-gradient(135deg, ${C.gold}12 0%, ${C.orange}08 100%)`, border: `1px solid ${C.gold}25` }}>
        <div className="flex items-center gap-1.5 mb-1"><Crown size={12} style={{ color: C.gold }} /><p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: C.gold }}>6-Month Bet</p></div>
        <p className="text-sm font-medium" style={{ color: C.text }}>Music in Vietnam. Web dev funds the launch. Everything else runs in the background.</p>
        <p className="text-xs mt-1.5 font-semibold" style={{ color: C.muted }}>{cmLabel}: 2x {prevLabel} = {usd(GOAL)} goal · 4 websites pending ($1,600)</p>
      </div>

      {/* Income Boost Recommendations */}
      <Card className="p-4">
        <button onClick={() => setShowBoosts(v => !v)} className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} style={{ color: C.cyan }} />
            <p className="text-sm font-bold" style={{ color: C.text }}>Income Boosts</p>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${C.cyan}15`, color: C.cyan }}>{INCOME_BOOSTS.length} moves</span>
          </div>
          <ChevronDown size={14} style={{ color: C.muted, transform: showBoosts ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
        </button>
        {showBoosts && (
          <div className="mt-3 space-y-3 slide-up">
            {INCOME_BOOSTS.map((b, i) => (
              <div key={i} className="rounded-xl p-3" style={{ background: C.card2, border: `1px solid ${b.color}20` }}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-xs font-semibold" style={{ color: b.color }}>{b.title}</p>
                  <span className="text-[10px] font-bold whitespace-nowrap" style={{ color: b.color }}>{b.impact}</span>
                </div>
                <p className="text-[11px] leading-relaxed" style={{ color: C.muted }}>{b.desc}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {MISSIONS.map(m => {
        const sc = STATUS_CFG[m.status]
        return (
          <Card key={m.id} className="p-5" style={{ borderTop: `2px solid ${m.color}60` }}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${m.color}15`, border: `1px solid ${m.color}30` }}>
                  <m.Icon size={17} style={{ color: m.color }} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: C.text }}>{m.name}</p>
                  <p className="text-[10px]" style={{ color: C.faint }}>{m.timeline}</p>
                </div>
              </div>
              <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ color: sc.color, background: sc.bg }}>{sc.label}</span>
            </div>
            <p className="text-xs leading-relaxed mb-4" style={{ color: C.muted }}>{m.goal}</p>

            {editing === m.id ? (
              <div className="slide-up">
                <textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  placeholder="Strategy notes, action steps, targets..."
                  className="w-full rounded-xl p-3 text-sm focus:outline-none resize-none"
                  style={{ background: C.card2, border: `1px solid ${C.border}`, color: C.text, minHeight: 110 }}
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={() => { setNotes(p => ({ ...p, [m.id]: draft })); setEditing(null) }} className="flex-1 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: m.color }}>Save</button>
                  <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: C.card2, color: C.muted }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div>
                {notes[m.id] ? <p className="text-xs leading-relaxed mb-3 whitespace-pre-wrap" style={{ color: C.muted }}>{notes[m.id]}</p> : <p className="text-xs italic mb-3" style={{ color: C.faint }}>No strategy notes yet.</p>}
                <button onClick={() => { setEditing(m.id); setDraft(notes[m.id] || '') }} className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: m.color }}>
                  <Pencil size={11} />{notes[m.id] ? 'Edit strategy' : 'Add strategy notes'}
                </button>
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

// ─── TREASURY ─────────────────────────────────────────────────────────────────
function Treasury({ income, setIncome, expenses, setExpenses }: { income: Income[]; setIncome: (v: Income[] | ((p: Income[]) => Income[])) => void; expenses: Expense[]; setExpenses: (v: Expense[] | ((p: Expense[]) => Expense[])) => void }) {
  const [month,   setMonth]   = useState(monthStr)
  const [showAdd, setShowAdd] = useState<'income' | 'expense' | null>(null)
  const [iForm,   setIForm]   = useState({ source: '', missionId: 'webdev', amount: '' })
  const [eForm,   setEForm]   = useState({ category: '', amount: '' })

  const mInc   = income.filter(i => i.date.startsWith(month))
  const mExp   = expenses.filter(e => e.date.startsWith(month))
  const totalIn  = mInc.reduce((s, i) => s + i.amount, 0)
  const totalOut = mExp.reduce((s, e) => s + e.amount, 0)

  const iStyle = { background: C.card2, border: `1px solid ${C.border}`, color: C.text }

  const addIncome = () => {
    if (!iForm.source || !iForm.amount) return
    setIncome(p => [...p, { id: uid(), source: iForm.source, missionId: iForm.missionId, amount: parseFloat(iForm.amount), date: todayStr() }])
    setIForm({ source: '', missionId: 'webdev', amount: '' }); setShowAdd(null)
  }
  const addExpense = () => {
    if (!eForm.category || !eForm.amount) return
    setExpenses(p => [...p, { id: uid(), category: eForm.category, amount: parseFloat(eForm.amount), date: todayStr() }])
    setEForm({ category: '', amount: '' }); setShowAdd(null)
  }

  return (
    <div className="space-y-4 slide-up">
      <div className="flex gap-2">
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="flex-1 rounded-xl px-3 py-2.5 text-sm focus:outline-none" style={iStyle} />
        <button onClick={() => setShowAdd(showAdd === 'income' ? null : 'income')} className="px-3 py-2.5 rounded-xl text-xs font-semibold" style={{ background: showAdd === 'income' ? C.green : 'rgba(52,211,153,0.12)', color: showAdd === 'income' ? '#000' : C.green }}>+ Income</button>
        <button onClick={() => setShowAdd(showAdd === 'expense' ? null : 'expense')} className="px-3 py-2.5 rounded-xl text-xs font-semibold" style={{ background: showAdd === 'expense' ? C.red : 'rgba(248,113,113,0.12)', color: showAdd === 'expense' ? '#000' : C.red }}>+ Expense</button>
      </div>

      {showAdd === 'income' && (
        <Card className="p-4 space-y-2 slide-up">
          <input value={iForm.source} onChange={e => setIForm(p => ({ ...p, source: e.target.value }))} placeholder="Source" className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none" style={iStyle} />
          <div className="flex gap-2">
            <input value={iForm.amount} onChange={e => setIForm(p => ({ ...p, amount: e.target.value }))} placeholder="USD amount" type="number" className="flex-1 rounded-xl px-3 py-2.5 text-sm focus:outline-none" style={iStyle} />
            <select value={iForm.missionId} onChange={e => setIForm(p => ({ ...p, missionId: e.target.value }))} className="rounded-xl px-3 text-sm focus:outline-none" style={iStyle}>{MISSIONS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
          </div>
          <button onClick={addIncome} className="w-full py-2.5 rounded-xl text-sm font-semibold" style={{ background: `linear-gradient(90deg, ${C.green}, ${C.cyan})`, color: '#000' }}>Save Income</button>
        </Card>
      )}

      {showAdd === 'expense' && (
        <Card className="p-4 space-y-2 slide-up">
          <input value={eForm.category} onChange={e => setEForm(p => ({ ...p, category: e.target.value }))} placeholder="Category" className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none" style={iStyle} />
          <input value={eForm.amount} onChange={e => setEForm(p => ({ ...p, amount: e.target.value }))} placeholder="USD amount" type="number" className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none" style={iStyle} />
          <button onClick={addExpense} className="w-full py-2.5 rounded-xl text-sm font-semibold" style={{ background: `linear-gradient(90deg, ${C.red}, ${C.pink})`, color: '#fff' }}>Save Expense</button>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[{ l: 'Income', v: totalIn, c: C.green }, { l: 'Expenses', v: totalOut, c: C.red }, { l: 'Profit', v: totalIn - totalOut, c: totalIn - totalOut >= 0 ? C.gold : C.red }].map(s => (
          <Card key={s.l} className="p-4 text-center"><p className="text-base font-bold" style={{ color: s.c }}>{usd(s.v)}</p><p className="text-[10px] mt-0.5" style={{ color: C.faint }}>{s.l}</p></Card>
        ))}
      </div>

      <Card className="p-5">
        <SLabel>Income Log</SLabel>
        {mInc.length === 0 ? <p className="text-sm text-center py-4" style={{ color: C.faint }}>No income logged.</p> : [...mInc].reverse().map(entry => {
          const m = MISSIONS.find(x => x.id === entry.missionId)
          return (
            <div key={entry.id} className="flex items-center justify-between py-2.5 border-b last:border-0 group" style={{ borderColor: C.border }}>
              <div className="flex items-center gap-2.5">
                {m && <m.Icon size={13} style={{ color: m.color }} />}
                <div><p className="text-sm font-medium" style={{ color: C.text }}>{entry.source}</p><p className="text-[11px]" style={{ color: C.faint }}>{entry.date}</p></div>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold" style={{ color: C.green }}>+{usd(entry.amount)}</p>
                <button onClick={() => setIncome(p => p.filter(i => i.id !== entry.id))} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: C.faint }}><X size={13} /></button>
              </div>
            </div>
          )
        })}
      </Card>

      <Card className="p-5">
        <SLabel>Expense Log</SLabel>
        {mExp.length === 0 ? <p className="text-sm text-center py-4" style={{ color: C.faint }}>No expenses logged.</p> : [...mExp].reverse().map(entry => (
          <div key={entry.id} className="flex items-center justify-between py-2.5 border-b last:border-0 group" style={{ borderColor: C.border }}>
            <div><p className="text-sm font-medium" style={{ color: C.text }}>{entry.category}</p><p className="text-[11px]" style={{ color: C.faint }}>{entry.date}</p></div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold" style={{ color: C.red }}>{usd(entry.amount)}</p>
              <button onClick={() => setExpenses(p => p.filter(e => e.id !== entry.id))} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: C.faint }}><X size={13} /></button>
            </div>
          </div>
        ))}
      </Card>
    </div>
  )
}

// ─── WISDOM ───────────────────────────────────────────────────────────────────
function Wisdom() {
  const [authorFilter, setAF] = useState('All')
  const [featured, setFeatured] = useState(() => doy() % QUOTES.length)

  const authors  = ['All', ...Array.from(new Set(QUOTES.map(q => q.author)))]
  const filtered = authorFilter === 'All' ? QUOTES : QUOTES.filter(q => q.author === authorFilter)
  const fq       = QUOTES[featured]

  const tagColors: Record<string, string> = { Growth: C.green, Money: C.gold, Mindset: C.purple, Execution: C.cyan, Focus: C.blue, Wealth: C.orange, Strategy: C.pink }

  return (
    <div className="space-y-4 slide-up">
      {/* Featured */}
      <div className="rounded-2xl p-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.12) 0%, rgba(34,211,238,0.06) 100%)', border: `1px solid ${C.purple}30` }}>
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10 float" style={{ background: `radial-gradient(circle, ${C.purple}, transparent)` }} />
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: C.purple }}>Today's Principle</p>
          <button onClick={() => setFeatured(i => (i + 1) % QUOTES.length)} className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: C.faint }}><RefreshCw size={11} /> Next</button>
        </div>
        <p className="text-base font-semibold leading-relaxed mb-4" style={{ color: C.text }}>"{fq.text}"</p>
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold" style={{ color: C.muted }}>— {fq.author}</p>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${tagColors[fq.tag] ?? C.purple}18`, color: tagColors[fq.tag] ?? C.purple }}>{fq.tag}</span>
        </div>
      </div>

      {/* Author filters */}
      <div className="flex flex-wrap gap-2">
        {authors.map(a => (
          <button key={a} onClick={() => setAF(a)} className="text-xs px-3 py-1.5 rounded-full font-semibold transition-all" style={{ background: authorFilter === a ? C.purple + '20' : C.card, color: authorFilter === a ? C.purple : C.muted, border: `1px solid ${authorFilter === a ? C.purple + '40' : C.border}` }}>
            {a}
          </button>
        ))}
      </div>

      {/* Quote list */}
      <div className="space-y-3">
        {filtered.map(q => (
          <Card key={q.id} className="p-4">
            <p className="text-sm leading-relaxed mb-3" style={{ color: C.text }}>"{q.text}"</p>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold" style={{ color: C.muted }}>— {q.author}</p>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${tagColors[q.tag] ?? C.purple}15`, color: tagColors[q.tag] ?? C.purple }}>{q.tag}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
const TABS: { id: TabId; label: string; Icon: React.ComponentType<any> }[] = [
  { id: 'hub',      label: 'Hub',      Icon: LayoutDashboard },
  { id: 'stats',    label: 'Stats',    Icon: BarChart3       },
  { id: 'quests',   label: 'Quests',   Icon: Target          },
  { id: 'missions', label: 'Missions', Icon: Shield          },
  { id: 'treasury', label: 'Treasury', Icon: Coins           },
  { id: 'wisdom',   label: 'Wisdom',   Icon: BookOpen        },
]

export default function Dashboard() {
  const [tab,      setTab]      = useState<TabId>('hub')
  const [tasks,    setTasks]    = useLS<Task[]>   ('jp3-tasks',    [])
  const [income,   setIncome]   = useLS<Income[]> ('jp3-income',   SEED_INCOME)
  const [expenses, setExpenses] = useLS<Expense[]>('jp3-expenses', SEED_EXPENSES)
  const [notes,    setNotes]    = useLS<Notes>    ('jp3-notes',    SEED_NOTES)
  const [streak,   setStreak]   = useLS<number>   ('jp3-streak',   3)

  // Merge SEED_NOTES into any missions that have no notes yet (one-time migration)
  useEffect(() => {
    setNotes(prev => {
      const missing = Object.keys(SEED_NOTES).filter(k => !prev[k])
      if (missing.length === 0) return prev
      return { ...SEED_NOTES, ...prev }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const xp  = calcXP(income, tasks)
  const lvl = getLevel(xp)
  const cm  = monthStr()
  const monthTotal = income.filter(i => i.date.startsWith(cm)).reduce((s, i) => s + i.amount, 0)

  return (
    <div className="min-h-screen" style={{ background: C.bg }}>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-52 bg-[#0B0A1E]" style={{ borderRight: `1px solid ${C.border}` }}>
        <div className="p-5 pb-4">
          <p className="text-[9px] font-semibold uppercase tracking-widest mb-2" style={{ color: C.faint }}>Mission Control</p>
          <p className="sg text-base font-bold" style={{ color: C.text }}>Joshua Porter</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shimmer-text" style={{ border: `1px solid ${lvl.cur.color}40` }}>LVL {lvl.cur.level} · {lvl.cur.name}</span>
          </div>
          <p className="text-xs mt-1 font-bold" style={{ color: C.green }}>{usd(monthTotal)} this month</p>
        </div>

        {/* XP bar in sidebar */}
        <div className="px-5 mb-4">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: C.faint + '40' }}>
            <div className="h-full rounded-full" style={{ width: `${lvl.pct}%`, background: `linear-gradient(90deg, ${lvl.cur.color}, ${lvl.next.color})` }} />
          </div>
          <p className="text-[10px] mt-1" style={{ color: C.faint }}>{xp} XP · {Math.round(lvl.pct)}% to {lvl.next.name}</p>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left"
              style={{ background: tab === t.id ? `${C.purple}15` : 'transparent', color: tab === t.id ? C.purple : C.muted }}
            >
              <t.Icon size={15} />
              {t.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t" style={{ borderColor: C.border }}>
          <div className="flex items-center gap-2">
            <Flame size={13} style={{ color: C.orange }} />
            <span className="text-xs font-bold" style={{ color: C.orange }}>{streak} day streak</span>
          </div>
          <p className="text-[10px] mt-1" style={{ color: C.faint }}>Goal: 2x last month</p>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="md:hidden sticky top-0 z-50" style={{ background: 'rgba(9,9,26,0.95)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${C.border}` }}>
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: C.faint }}>Mission Control</p>
            <p className="sg text-base font-bold" style={{ color: C.text }}>Joshua Porter</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Flame size={14} style={{ color: C.orange }} />
              <span className="text-sm font-bold" style={{ color: C.orange }}>{streak}</span>
            </div>
            <div className="text-right">
              <p className="text-[10px]" style={{ color: C.faint }}>LVL {lvl.cur.level}</p>
              <p className="text-sm font-bold" style={{ color: C.green }}>{usd(monthTotal)}</p>
            </div>
          </div>
        </div>
        {/* XP bar in mobile header */}
        <div className="h-0.5" style={{ background: C.faint + '30' }}>
          <div className="h-full" style={{ width: `${lvl.pct}%`, background: `linear-gradient(90deg, ${lvl.cur.color}, ${lvl.next.color})` }} />
        </div>
      </header>

      {/* Content */}
      <main className="md:ml-52 px-4 py-5 pb-24 md:pb-8">
        <div style={{ maxWidth: '36rem' }}>
          {tab === 'hub'      && <Hub      income={income} tasks={tasks} expenses={expenses} streak={streak} />}
          {tab === 'stats'    && <Stats    income={income} expenses={expenses} />}
          {tab === 'quests'   && <Quests   tasks={tasks} setTasks={setTasks} streak={streak} setStreak={setStreak} />}
          {tab === 'missions' && <Missions income={income} notes={notes} setNotes={setNotes} />}
          {tab === 'treasury' && <Treasury income={income} setIncome={setIncome} expenses={expenses} setExpenses={setExpenses} />}
          {tab === 'wisdom'   && <Wisdom />}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0" style={{ background: 'rgba(9,9,26,0.97)', backdropFilter: 'blur(12px)', borderTop: `1px solid ${C.border}` }}>
        <div className="flex">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 flex flex-col items-center py-2 gap-0.5 transition-all"
              style={{ color: tab === t.id ? C.purple : C.faint }}
            >
              <t.Icon size={17} />
              <span className="text-[9px] font-semibold">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
