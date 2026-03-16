import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

function getFirebaseApp() {
  if (getApps().length) return getApps()[0]

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (!raw) {
    console.warn('FIREBASE_SERVICE_ACCOUNT_KEY is not set, Firebase Admin will not be initialized')
    return null
  }

  const serviceAccount = JSON.parse(raw)
  return initializeApp({
    credential: cert(serviceAccount),
  })
}

const app = getFirebaseApp()
const auth = app ? getAuth() : null
const db = app ? getFirestore() : null

export { auth, db }
