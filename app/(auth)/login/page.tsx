import { Suspense } from "react"

import { LoginForm } from "@/components/LoginForm"

export default function LoginPage() {
  return (
    <main className='min-h-screen bg-stone-950 text-stone-100 flex flex-col'>
      {/* Header — matches homepage hero */}
      <header className='relative flex flex-col items-center justify-center text-center px-6 pt-16 pb-14 overflow-hidden'>
        <div className='absolute inset-0 pointer-events-none'>
          <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] rounded-full bg-amber-900/20 blur-3xl' />
          <div className='absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-700/40 to-transparent' />
          <div className='absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-700/40 to-transparent' />
        </div>

        <div className='relative mb-5 w-16 h-16 rounded-full border-2 border-amber-600/60 bg-stone-900 flex items-center justify-center shadow-lg shadow-amber-900/30'>
          <svg
            viewBox='0 0 40 40'
            className='w-9 h-9 text-amber-500'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
          >
            <polygon points='20,4 36,14 36,26 20,36 4,26 4,14' />
            <polygon
              points='20,10 29,15 29,25 20,30 11,25 11,15'
              opacity='0.5'
            />
            <line x1='20' y1='4' x2='20' y2='10' />
            <line x1='36' y1='14' x2='29' y2='15' />
            <line x1='36' y1='26' x2='29' y2='25' />
            <line x1='20' y1='36' x2='20' y2='30' />
            <line x1='4' y1='26' x2='11' y2='25' />
            <line x1='4' y1='14' x2='11' y2='15' />
          </svg>
        </div>

        <h1 className='relative font-serif text-5xl sm:text-6xl font-bold text-amber-400 tracking-wide drop-shadow-lg'>
          Unity Halls
        </h1>
      </header>

      {/* Login form */}
      <div className='flex-1 flex items-center justify-center px-6 py-12'>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  )
}
