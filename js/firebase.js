/* =========================================================
   FIREBASE.JS
   ========================================================= */

const firebaseConfig = {
  apiKey: "AIzaSyCKTf7OYpbPu_RjRax90WNfFE5q6s8R5WY",
  authDomain: "portfolio-site-9399d.firebaseapp.com",
  projectId: "portfolio-site-9399d",
  storageBucket: "portfolio-site-9399d.firebasestorage.app",
  messagingSenderId: "289670079147",
  appId: "1:289670079147:web:76ce566c24f6d839200dee"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

async function firebaseLogin(email, password) {
  return await auth.signInWithEmailAndPassword(email, password);
}

async function firebaseLogout() {
  return await auth.signOut();
}

async function firebaseForgotPassword(email) {
  return await auth.sendPasswordResetEmail(email);
}

async function firebaseChangePassword(currentPassword, newPassword) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in.');
  const credential = firebase.auth.EmailAuthProvider.credential(
    user.email,
    currentPassword
  );
  await user.reauthenticateWithCredential(credential);
  await user.updatePassword(newPassword);
}

async function getAuthToken() {
  const user = auth.currentUser;
  if (!user) return null;
  return await user.getIdToken(true);
}

function onAuthStateChanged(callback) {
  return auth.onAuthStateChanged(callback);
}

async function getCollection(collectionName) {
  try {
    const snapshot = await db.collection(collectionName).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (err) {
    console.warn('getCollection error:', err);
    return [];
  }
}

async function getFirestoreDoc(collectionName, docId) {
  const doc = await db.collection(collectionName).doc(docId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

async function addFirestoreDoc(collectionName, data) {
  const ref = await db.collection(collectionName).add({
    ...data,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  return { id: ref.id, ...data };
}

async function setFirestoreDoc(collectionName, docId, data) {
  await db.collection(collectionName).doc(docId).set(data, { merge: true });
  return { id: docId, ...data };
}

async function deleteFirestoreDoc(collectionName, docId) {
  await db.collection(collectionName).doc(docId).delete();
}

async function getSiteContent() {
  const doc = await db.collection('config').doc('site-content').get();
  if (!doc.exists) return null;
  return doc.data();
}

async function saveSiteContent(data) {
  await db.collection('config').doc('site-content').set(data, { merge: true });
}