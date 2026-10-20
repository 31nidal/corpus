// No optional trackers are installed: do not fabricate a consent record.
document.getElementById('check-preferences')?.addEventListener('click',()=>{
 document.getElementById('preference-status').textContent='Aucun traceur facultatif n’est activé par cette application. Aucun consentement facultatif n’a été enregistré.'
})
document.getElementById('clear-guest')?.addEventListener('click',()=>{
 if(!window.confirm('Effacer les notes, conversations, préférences et progrès invités de ce navigateur ? Les données de votre compte restent conservées.'))return
 try{
  for(const key of Object.keys(localStorage))if(key.startsWith('corpus-'))localStorage.removeItem(key)
  document.getElementById('preference-status').textContent='Données invitées effacées de cet appareil. Rechargez les autres onglets MyCorpus3D ouverts.'
 }catch{document.getElementById('preference-status').textContent='Stockage inaccessible. Utilisez les réglages de votre navigateur.'}
})
