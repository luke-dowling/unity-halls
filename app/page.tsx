import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

export default async function Home() {
  const session = await auth()
  if (session) redirect("/room")

  return (
    <main className='min-h-screen bg-stone-950 text-stone-100 flex flex-col'>
      {/* Hero */}
      <section className='relative flex flex-col items-center justify-center text-center px-6 pt-24 pb-20 overflow-hidden'>
        {/* Decorative background glow */}
        <div className='absolute inset-0 pointer-events-none'>
          <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-amber-900/20 blur-3xl' />
          <div className='absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-700/40 to-transparent' />
          <div className='absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-700/20 to-transparent' />
        </div>

        {/* Crest / logo mark */}
        <div className='relative mb-6 flex flex-col items-center gap-3'>
          <div className='w-16 h-16 rounded-full border-2 border-amber-600/60 bg-stone-900 flex items-center justify-center shadow-lg shadow-amber-900/30'>
            <svg
              viewBox='0 0 40 40'
              className='w-9 h-9 text-amber-500'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.5'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              {/* Simple d20 / shield crest */}
              <polygon points='20,4 36,14 36,26 20,36 4,26 4,14' />
              <polygon points='20,10 29,15 29,25 20,30 11,25 11,15' opacity='0.5' />
              <line x1='20' y1='4' x2='20' y2='10' />
              <line x1='36' y1='14' x2='29' y2='15' />
              <line x1='36' y1='26' x2='29' y2='25' />
              <line x1='20' y1='36' x2='20' y2='30' />
              <line x1='4' y1='26' x2='11' y2='25' />
              <line x1='4' y1='14' x2='11' y2='15' />
            </svg>
          </div>
        </div>

        <h1 className='relative font-serif text-5xl sm:text-6xl lg:text-7xl font-bold text-amber-400 tracking-wide drop-shadow-lg mb-4'>
          Unity Halls
        </h1>
        <p className='relative text-stone-300 text-lg sm:text-xl max-w-xl leading-relaxed mb-10'>
          A private chamber for your party. Gather around the table, share your
          faces, and let the Dungeon Master set the scene — all in one enchanted
          space.
        </p>

        <Link
          href='/login'
          className='relative inline-flex items-center gap-2 rounded-md bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold text-base px-8 py-3 transition-colors shadow-lg shadow-amber-900/40'
        >
          Enter the Hall
          <svg
            className='w-4 h-4'
            fill='none'
            stroke='currentColor'
            strokeWidth='2.5'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              d='M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3'
            />
          </svg>
        </Link>
      </section>

      {/* Divider */}
      <div className='flex items-center gap-4 px-8 sm:px-16'>
        <div className='flex-1 h-px bg-stone-800' />
        <svg
          className='w-5 h-5 text-amber-700/60 shrink-0'
          viewBox='0 0 20 20'
          fill='currentColor'
        >
          <path d='M10 2l2.4 5.4 5.6.8-4 4.1.9 5.7L10 15.4 5.1 18l.9-5.7-4-4.1 5.6-.8z' />
        </svg>
        <div className='flex-1 h-px bg-stone-800' />
      </div>

      {/* Features */}
      <section className='px-6 py-16 max-w-5xl mx-auto w-full'>
        <h2 className='font-serif text-2xl sm:text-3xl text-amber-300 text-center mb-12 tracking-wide'>
          What awaits inside
        </h2>

        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
          <FeatureCard
            icon={
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z'
              />
            }
            title='Live Video'
            body='Up to six adventurers share live video feeds, with character portraits layered over each feed so the table feels alive.'
          />
          <FeatureCard
            icon={
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M2.25 15.75 7.5 10.5l3.75 3.75 5.25-6 3.75 4.5M3.75 19.5h16.5'
              />
            }
            title='Dynamic Scenes'
            body='The Dungeon Master selects from a library of illustrated backgrounds — dungeons, forests, castles — that fill the room instantly.'
          />
          <FeatureCard
            icon={
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='m9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z'
              />
            }
            title='Atmospheric Soundtracks'
            body='Ambient soundtracks and atmospheric audio are queued and broadcast by the DM, keeping the whole party immersed without leaving the tab.'
          />
          <FeatureCard
            icon={
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z'
              />
            }
            title='Character Portraits'
            body="Each player uploads their character portrait. It appears as a stylized overlay on their video tile, giving every seat at the table a personality."
          />
          <FeatureCard
            icon={
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.74v6.516Z'
              />
            }
            title='In-Room Chat'
            body="Messages stay in the hall — no jumping between apps. Every character's name and color appear alongside their words."
          />
          <FeatureCard
            icon={
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z'
              />
            }
            title='DM Command'
            body="The Dungeon Master controls everything — scenes, music, atmosphere, player management — through a dedicated panel, keeping narrators in charge."
          />
        </div>
      </section>

      {/* Divider */}
      <div className='flex items-center gap-4 px-8 sm:px-16'>
        <div className='flex-1 h-px bg-stone-800' />
        <svg
          className='w-5 h-5 text-amber-700/60 shrink-0'
          viewBox='0 0 20 20'
          fill='currentColor'
        >
          <path d='M10 2l2.4 5.4 5.6.8-4 4.1.9 5.7L10 15.4 5.1 18l.9-5.7-4-4.1 5.6-.8z' />
        </svg>
        <div className='flex-1 h-px bg-stone-800' />
      </div>

      {/* How it works */}
      <section className='px-6 py-16 max-w-3xl mx-auto w-full'>
        <h2 className='font-serif text-2xl sm:text-3xl text-amber-300 text-center mb-12 tracking-wide'>
          How a session works
        </h2>

        <ol className='space-y-8'>
          {[
            {
              n: "I",
              title: "The DM opens the hall",
              body: "The Dungeon Master logs in and prepares the room — choosing a background scene and queuing up music before the party arrives.",
            },
            {
              n: "II",
              title: "Adventurers take their seats",
              body: "Each player logs in with their credentials, selects a character portrait, and joins the video room. Up to five players can sit at the table.",
            },
            {
              n: "III",
              title: "The session begins",
              body: "The DM narrates while controlling the atmosphere — swapping scenes mid-session, playing tension music during a boss fight, or quiet tavern ambience for role-play.",
            },
            {
              n: "IV",
              title: "The adventure unfolds",
              body: "Characters are visible through portrait overlays, chat keeps banter alive, and the whole party stays immersed in one cohesive space from start to finish.",
            },
          ].map(({ n, title, body }) => (
            <li key={n} className='flex gap-5'>
              <span className='font-serif text-amber-600 text-xl font-bold w-8 shrink-0 pt-0.5 text-center'>
                {n}
              </span>
              <div>
                <h3 className='font-serif text-amber-200 text-lg font-semibold mb-1'>
                  {title}
                </h3>
                <p className='text-stone-400 text-sm leading-relaxed'>{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* CTA footer */}
      <section className='mt-auto px-6 py-16 text-center border-t border-stone-800 bg-stone-900/50'>
        <h2 className='font-serif text-2xl sm:text-3xl text-amber-300 mb-4 tracking-wide'>
          Your party is waiting
        </h2>
        <p className='text-stone-400 text-sm max-w-sm mx-auto mb-8'>
          Request your credentials from your Dungeon Master, then step through the doors.
        </p>
        <Link
          href='/login'
          className='inline-flex items-center gap-2 rounded-md bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold text-base px-8 py-3 transition-colors shadow-lg shadow-amber-900/40'
        >
          Enter the Hall
          <svg
            className='w-4 h-4'
            fill='none'
            stroke='currentColor'
            strokeWidth='2.5'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              d='M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3'
            />
          </svg>
        </Link>
      </section>
    </main>
  )
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className='bg-stone-900 border border-stone-800 rounded-lg p-5 flex flex-col gap-3 hover:border-amber-800/50 transition-colors'>
      <div className='w-9 h-9 rounded-md bg-stone-800 border border-stone-700 flex items-center justify-center shrink-0'>
        <svg
          className='w-5 h-5 text-amber-500'
          fill='none'
          stroke='currentColor'
          strokeWidth='1.5'
          viewBox='0 0 24 24'
        >
          {icon}
        </svg>
      </div>
      <h3 className='font-serif text-amber-200 font-semibold text-base'>
        {title}
      </h3>
      <p className='text-stone-400 text-sm leading-relaxed'>{body}</p>
    </div>
  )
}
