import { useState } from 'react'
import { useRouter } from 'next/router'
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import { FolderArrowDownIcon } from '@heroicons/react/24/outline'
import { signIn, useSession } from 'next-auth/react'
import { toast } from 'react-toastify'
import clx from 'classnames'

import { INPUT_DEFAULT_CSS } from '../ui/form/TextArea'
import Spinner from '../ui/Spinner'
import { LeanAlert } from '../ui/micro/AlertDialogue'

interface Props {
  username: string
}
// regex pattern to validate mountain project input
const pattern = /^https:\/\/www.mountainproject.com\/user\/\d{9}\/[a-zA-Z-]*/

/**
 *
 * @prop username -- the openbeta username of the user
 *
 * @returns JSX element
 */
export function ImportFromMtnProj ({ username }: Props): JSX.Element {
  const router = useRouter()
  const [mpUID, setMPUID] = useState('')
  const session = useSession()
  const [show, setShow] = useState<boolean>(false)
  const [showInput, setShowInput] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  // this function is for when the component is rendered as a button and sends the user straight to the input form
  function straightToInput (): void {
    if (session.status !== 'authenticated') {
      void signIn('auth0')
    } else {
      setShowInput(true)
      setShow(true)
    }
  }

  async function getTicks (): Promise<void> {
    setErrors([])
    if (pattern.test(mpUID)) {
      setLoading(true)

      try {
        const { count } = await bulkImportProxy(mpUID)

        if (count > 0) {
          toast.info(
            <>
              {count} ticks have been imported! 🎉 <br />
              Redirecting in a few seconds...`
            </>
          )

          setTimeout(() => {
            void router.replace(`/u2/${username}`)
          }, 2000)
          setShow(false)
        } else {
          setErrors(['Sorry, no ticks were found for that user. Please check your Mountain Project ID and try again.'])
          toast.error('Sorry, no ticks were found for that user. Please check your Mountain Project ID and try again.')
        }
      } catch (error) {
        toast.error('Sorry, something went wrong. Please check your network and try again.')
        setErrors(['Sorry, something went wrong. Please check your network and try again.'])
      } finally {
        setLoading(false)
      }
    } else {
      // handle errors
      setErrors(['Please input a valid Mountain Project ID'])
    }
    setLoading(false)
  }

  return (
    <>
      <button onClick={straightToInput} className='btn btn-xs md:btn-sm btn-primary'>Import ticks</button>

      {show && (
        <LeanAlert
          icon={<FolderArrowDownIcon className='h-6 w-6 text-gray-400' aria-hidden='true' />}
          title={showInput ? 'Input your Mountain Project profile link' : 'Import your ticks from Mountain Project'}
          description={!showInput ? "Don't lose your progress, bring it over to Open Beta." : null}
          closeOnEsc
          stackChildren
        >
          {(errors != null) && errors.length > 0 && errors.map((err, i) => <p className='mt-2 text-ob-primary' key={i}>{err}</p>)}

          {showInput && (
            <div className='mt-1 relative rounded-md shadow-sm'>
              <input
                type='text'
                name='website'
                id='website'
                value={mpUID}
                onChange={(e) => setMPUID(e.target.value)}
                className={clx(INPUT_DEFAULT_CSS, 'w-full')}
                placeholder='https://www.mountainproject.com/user/123456789/username'
                disabled={loading}
              />
            </div>
          )}

          <div className='mt-3 flex space-x-7 justify-center'>
            {!showInput && (
              <button
                type='button'
                onClick={() => setShowInput(true)}
                className='text-center p-2 border-2 rounded-xl border-ob-primary transition
                text-ob-primary hover:bg-ob-primary hover:ring hover:ring-ob-primary ring-offset-2
                hover:text-white w-32 font-bold'
              >
                {loading ? 'Working...' : 'Show me how'}
              </button>
            )}

            {showInput && (
              <button
                type='button'
                onClick={() => { void getTicks() }}
                className='btn btn-primary'
                disabled={loading}
              >
                {loading ? <Spinner /> : 'Get my ticks!'}
              </button>
            )}

            <AlertDialogPrimitive.Cancel
              asChild onClick={() => {
                setShow(false)
                setErrors([])
              }}
            >
              <button className='btn btn-outline' disabled={loading}>Cancel</button>
            </AlertDialogPrimitive.Cancel>
          </div>
        </LeanAlert>
      )}
    </>
  )
}

export default ImportFromMtnProj

type BulkImportFn = (profileUrl: string) => Promise<{ count: number }>

const bulkImportProxy: BulkImportFn = async (profileUrl: string) => {
  const res = await fetch('/api/user/bulkImportTicks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      profileUrl
    })
  })
  return await res.json()
}
