import Computer from '@/components/Computer'
import { SrContent } from '@/components/SrContent'
import { sendMessage } from './actions'

export default function Page() {
  return (
    <>
      <SrContent />
      <Computer send={sendMessage} />
    </>
  )
}
