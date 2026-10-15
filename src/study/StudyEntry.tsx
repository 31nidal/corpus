import {lazy, Suspense, useState, type ReactNode} from 'react'
import {storageScope, useAccount} from '../account/store'
import './v2/versionSwitch.css'
const ClassicWorkspace = lazy(() => import('./MyCoursesWorkspace'))
const StudyWorkspace = lazy(() => import('./v2/StudyWorkspace'))

type StudyEntryProps = {
  onOpenAccount?: () => void; initialDocumentId?: string | null; initialSectionId?: string | null
  onOpenDocument?: (id: string | null) => void; onNavigateAtlas?: () => void
}
function AccountStudyEntry(props: StudyEntryProps & {authenticated: boolean}) {
  const [storage] = useState(storageScope)
  const [beta, setBeta] = useState(() => {try {return props.authenticated && storage.getItem('corpus-study-v2') === '1'} catch {return false}})
  function toggle(value: boolean) {setBeta(value); try {storage.setItem('corpus-study-v2', value ? '1' : '0')} catch {/* UI remains reversible without persistent storage. */}}
  const versionControl: ReactNode = props.authenticated ? <div className="sv2-version-switch"><button onClick={() => toggle(!beta)}>{beta ? 'Revenir à l’interface actuelle' : 'Essayer Study 2.0 · bêta'}</button></div> : null
  return <Suspense fallback={<section className="study-workspace" role="status">Chargement de vos cours…</section>}>
    {beta ? <StudyWorkspace {...props} onClassic={() => toggle(false)} versionControl={versionControl}/> : <ClassicWorkspace {...props} versionControl={versionControl}/>}
  </Suspense>
}
export default function StudyEntry(props: StudyEntryProps) {
  const account = useAccount()
  return <AccountStudyEntry key={account.user?.id ?? 'guest'} {...props} authenticated={Boolean(account.user)}/>
}
