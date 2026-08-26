interface SubmitButtonProps {
  pending: boolean
  label: string
  pendingLabel: string
}

export const SubmitButton = ({
  pending,
  label,
  pendingLabel,
}: SubmitButtonProps) => {
  return (
    <button
      type='submit'
      disabled={pending}
      className='w-full rounded-md bg-amber-600 hover:bg-amber-500 disabled:bg-stone-700 disabled:text-stone-500 text-stone-950 font-semibold py-3 text-base transition-colors'
    >
      {pending ? pendingLabel : label}
    </button>
  )
}
