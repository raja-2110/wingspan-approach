<script type="module">
  // Import Firebase (v9 modular)
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
  import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

  // ✅ Your Firebase Config here
  const firebaseConfig = {
    apiKey: "AIzaSyAr_jRtJr2acnuO_CR2h6DsElHpqtb2_d8",
    authDomain: "YOUR-PROJECT-ID.firebaseapp.com",
    projectId: "YOUR-PROJECT-ID",
    storageBucket: "YOUR-PROJECT-ID.appspot.com",
    messagingSenderId: "YOUR-SENDER-ID",
    appId: "YOUR-APP-ID"
  {"}"};

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
</script>
