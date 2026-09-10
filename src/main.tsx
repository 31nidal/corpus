import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import {initialize,useAccount} from './account/store'
import './account/account.css'
void initialize()
function AccountRoot(){const account=useAccount();return account.ready?<App key={(account.user?.id||'guest')+':'+account.revision}/>:<div className="account-loading">Ouverture de MyCorpus…</div>}
import '@fontsource-variable/dm-sans/wght.css'
import '@fontsource-variable/manrope/wght.css'
import './styles.css'
import './study/study.css'
import './study/library.css'
import './study/diagrams.css'
import './study/catalog.css'

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><AccountRoot /></React.StrictMode>)
