# Career Katta — Multi-Form Response Dashboard + Live Forms

एका फोल्डरमध्ये संपूर्ण सेटअप: **Admin Dashboard** + **अनेक Forms (Student / Principal / Coordinator...)** +
**Public Response Forms**, जे एकमेकांशी लाईव्ह जोडलेले आहेत.

> डॅशबोर्डवर **"+ New Form"** क्लिक करून हवे तेवढे वेगवेगळे फॉर्म बनवा (उदा. Student Registration,
> Principal Registration, Coordinator Registration...) → प्रत्येक फॉर्मला स्वतःची वेगळी शेअर लिंक मिळते →
> ती लिंक पाठवा → कोणीही तो फॉर्म भरला की तो डेटा **त्याच फॉर्मच्या** शॉर्टलिस्टमध्ये लगेच दिसतो — जेवढे
> फील्ड त्या फॉर्ममध्ये घेतले तेवढेच कॉलम त्या शॉर्टलिस्टमध्ये दिसतात. वेगळी Excel फाईल डाउनलोड/अपलोड
> करावी लागत नाही.

---

## 📁 Folder structure

```
career-katta-college-responses/
├── server.js                 # Express backend + JSON API (the "brain")
├── package.json
├── data/
│   ├── forms.json            # ← every form's definition lives here (title, fields, slug)
│   └── responses.json        # ← every submitted response, tagged with which form it belongs to
├── public/
│   ├── dashboard.html        # Admin dashboard — Forms switcher + live table per form
│   ├── form.html             # Public, shareable response form (?form=<slug> selects which one)
│   ├── css/style.css         # Shared Career Katta navy/gold design system
│   └── js/
│       ├── dashboard.js      # Forms switcher + form builder + live polling logic
│       └── public-form.js    # Renders + submits whichever form is in the URL
└── README.md
```

---

## ▶️ Run it locally (2 minutes)

You need [Node.js](https://nodejs.org) 18+ installed.

```bash
cd career-katta-college-responses
npm install
npm start
```

You'll see:

```
Career Katta server running: http://localhost:3000
  Admin dashboard : http://localhost:3000/dashboard.html
  Public form     : http://localhost:3000/form.html?form=<slug>
  Admin key       : career-katta-admin
```

Open `http://localhost:3000/dashboard.html` — तुमचे आधीचे 28 College Response रेकॉर्ड्स आधीच
"College Responses" नावाच्या फॉर्ममध्ये (पहिला फॉर्म) दिसतील.

---

## 🆕 एकाहून अधिक फॉर्म बनवणे (Student / Principal / Coordinator)

1. डॅशबोर्डवरच्या **"Your Forms"** पॅनलमध्ये **"+ New Form"** क्लिक करा.
2. फॉर्मला title द्या (उदा. "Student Registration").
3. **Quick start** बटणांनी (Student / Principal / Coordinator fields) तयार प्रीसेट फील्ड लगेच जोडता येतात,
   किंवा **"+ Add a field"** ने स्वतः हवे तसे फील्ड बनवा — प्रत्येक फील्डला:
   - **Label** (उदा. "विद्यार्थ्याचे नाव")
   - **Type** (text / phone / email / textarea / dropdown)
   - **Required** — भरणे बंधनकारक आहे का
   - **Filterable** — डॅशबोर्डवर त्या फील्डचा ड्रॉपडाउन फिल्टर हवा का (उदा. तालुका, जिल्हा)
4. **"Create form & get link"** क्लिक करा — याने त्या फॉर्मसाठी एक वेगळी, कायमची शेअर लिंक तयार होते
   (उदा. `http://localhost:3000/form.html?form=student-registration`).
5. ही लिंक विद्यार्थ्यांना/प्राचार्यांना/समन्वयकांना वेगवेगळी पाठवा — प्रत्येक फॉर्मचा डेटा **त्याच्याच**
   शॉर्टलिस्टमध्ये स्वतंत्रपणे जमा होतो, इतर फॉर्मशी मिसळत नाही.

पहिल्या admin action (save/delete) वर एकदाच **admin key** विचारेल — डीफॉल्ट `career-katta-admin`
(खाली बदलण्याची पद्धत दिली आहे). एकदा दिल्यावर ब्राउझरमध्ये लक्षात राहते.

---

## 🔗 फॉर्म शेअर करणे व लाईव्ह डेटा (मूळ मागणी #1, #2, #3)

1. "Your Forms" मधल्या कोणत्याही फॉर्म कार्डवर क्लिक करा — तो फॉर्म निवडला जातो व त्याचा live data
   खाली दिसतो.
2. त्या कार्डवरचं **"↗ Link"** बटण दाबून ती फॉर्म लिंक उघडा/कॉपी करा.
3. जितके फील्ड तुम्ही त्या फॉर्ममध्ये (उदा. नाव, मोबाईल, तालुका, जिल्हा, कॉलेजचे नाव) निवडले, तेवढेच
   कॉलम त्या फॉर्मच्या शॉर्टलिस्ट टेबलमध्ये आपोआप दिसतात.
4. फॉर्म भरला गेला की डॅशबोर्ड दर 6 सेकंदांनी आपोआप पोल करतो — नवीन रो सोनेरी हायलाइटसह येते व
   "🔔 N new responses came in live" असा toast दिसतो. Page refresh करावं लागत नाही.
5. Search + Filterable फील्ड्सचे ड्रॉपडाउन (उदा. तालुका/जिल्हा) फक्त त्या निवडलेल्या फॉर्मपुरते काम
   करतात.
6. चेकबॉक्सने रो शॉर्टलिस्ट करा → **"Download Shortlisted (.xlsx)"** ने फक्त शॉर्टलिस्ट केलेला डेटा,
   निवडलेल्या फील्डसहच, Excel मध्ये डाउनलोड होतो.

---

## 🖼️ Banner / Flyer image (प्रत्येक फॉर्मसाठी वेगळा)

फॉर्म बनवताना/edit करताना (फॉर्म एकदा **save** केल्यानंतर) builder मध्ये **"Banner / Flyer image"**
सेक्शन दिसतो:

1. JPG / PNG / WEBP / GIF इमेज निवडा (कमाल 4MB) — निवडताच लगेच अपलोड होते.
2. ही इमेज त्या फॉर्मच्या **public page** वर (`form.html?form=<slug>`) सगळ्यात वर, title च्या आधी दिसते —
   उदा. महाविद्यालयाचा banner, event flyer, sponsor banner इ.
3. Banner बदलायचा असेल तर नवीन इमेज निवडा (जुनी आपोआप काढली जाते), किंवा **"🗑 Remove banner"** ने
   पूर्ण काढून टाका.
4. प्रत्येक फॉर्मचा banner स्वतंत्र असतो — Student Registration आणि Principal Registration ला
   वेगवेगळे banners ठेवता येतात.

> **नवीन फॉर्म बनवताना:** आधी फॉर्म एकदा **save/create** करा (fields सह) — त्यानंतरच banner upload
> option दिसतो, कारण banner त्या फॉर्मच्या id शी जोडला जातो.

### Deploy करताना लक्षात ठेवा
Banner images `public/uploads/banners/` फोल्डरमध्ये साठवल्या जातात — हे JSON डेटासारखंच
filesystem वर आहे. त्यामुळे आधी सांगितलेला **Persistent Disk** सल्ला बॅनर इमेजेसनाही तितकाच लागू
होतो — free/ephemeral hosting वर banner images पण डिलीट होऊ शकतात.

---

## ✏️ फॉर्म edit / delete करणे

- फॉर्म कार्डवरच्या **"🛠 Edit"** बटणाने त्या फॉर्मचे फील्ड बदलता येतात (लिंक तीच राहते).
- **"🗑"** बटणाने संपूर्ण फॉर्म व त्याचा सर्व डेटा कायमचा डिलीट होतो (खात्री विचारली जाते).

---

## ✅ इतर वैशिष्ट्ये (3 मागण्यांव्यतिरिक्त)

- **Manual add** — "+ Add response manually", फोनवरून आलेल्या माहितीसाठी.
- **Delete** — प्रत्येक रोवर ✕, तसेच shortlisted रो एकत्र बल्क-डिलीट.
- **Old-style Export toggle** — जुन्या पद्धतीने पूर्ण डेटा `.xlsx` म्हणून डाउनलोड करण्याचा पर्यायही आहे.

---

## 🔐 Admin key बदलणे (live करण्याआधी नक्की करा)

Admin key संरक्षण देते: फॉर्म बनवणे/बदलणे/डिलीट करणे, रिस्पॉन्स डिलीट करणे, manual add करणे.
लिंक असलेली कोणतीही व्यक्ती फक्त **submit** करू शकते — डॅशबोर्ड किंवा डेटा बघू शकत नाही.

```bash
ADMIN_KEY="your-secret-here" npm start
```

डीफॉल्ट `career-katta-admin` लाईव्ह सर्व्हरवर कधीही ठेवू नका.

---

## 🌐 Deploy करणे

कोणत्याही Node.js hosting वर चालेल: Render, Railway, VPS, cPanel (Node support असल्यास), इ.

1. संपूर्ण फोल्डर सर्व्हरवर अपलोड करा.
2. `npm install`
3. `ADMIN_KEY` आणि (हवं असल्यास) `PORT` environment variable म्हणून सेट करा.
4. `npm start` (किंवा `pm2 start server.js`).
5. तुमचा डोमेन/सबडोमेन (उदा. `responses.careerkatta.in`) त्या Node process कडे पॉइंट करा.
6. प्रत्येक फॉर्मची लिंक अशी दिसेल: `https://responses.careerkatta.in/form.html?form=student-registration`
   डॅशबोर्ड: `https://responses.careerkatta.in/dashboard.html`

### Scaling note
सर्व डेटा `data/` मधल्या दोन साध्या JSON फाईल्समध्ये आहे — हजारो रेकॉर्ड्ससाठी पुरेसं आहे. खूप मोठ्या
प्रमाणावर (अनेक admin, लाखो रेकॉर्ड्स) वापरायचं असल्यास `server.js` मधल्या `readJSON`/`writeJSON` ऐवजी
खरा database (MongoDB / Postgres) वापरता येईल — बाकी routes आणि frontend तसेच राहतील.

---

## 🔌 API (developer reference)

| Method | Path | Auth | उपयोग |
|---|---|---|---|
| GET | `/api/forms` | Public | सर्व फॉर्म्सची यादी (responseCount सह) |
| GET | `/api/forms/:idOrSlug` | Public | एका फॉर्मचं config (public form + dashboard दोघेही वापरतात) |
| POST | `/api/forms` | Admin | नवीन फॉर्म बनवा |
| PUT | `/api/forms/:id` | Admin | फॉर्मचे फील्ड/title बदला |
| DELETE | `/api/forms/:id` | Admin | फॉर्म + त्याचा सर्व डेटा डिलीट |
| POST | `/api/forms/:id/banner` | Admin | Banner/flyer इमेज अपलोड/बदल (multipart, field name `banner`) |
| DELETE | `/api/forms/:id/banner` | Admin | Banner/flyer इमेज काढा |
| GET | `/api/forms/:id/responses` | Public | त्या फॉर्मचे सर्व रिस्पॉन्स (dashboard polls this) |
| POST | `/api/forms/:id/responses` | Public | फॉर्म सबमिट (शेअर केलेली लिंक भरल्यावर) |
| POST | `/api/forms/:id/responses/manual` | Admin | फोनवरून आलेली माहिती manually जोडा |
| DELETE | `/api/forms/:id/responses/:responseId` | Admin | एक रिस्पॉन्स डिलीट |
| POST | `/api/forms/:id/responses/bulk-delete` | Admin | shortlisted रिस्पॉन्सेस bulk-delete |

Admin endpoints ना हेडर लागतो: `x-admin-key: <your key>`

---

## ❓ FAQ

**Q: एका फॉर्ममध्ये "AISHE Code" सारखं unique field काढलं तर शॉर्टलिस्ट कशी काम करेल?**
प्रत्येक फॉर्मचं स्वतःचं `uniqueField` असतं (डीफॉल्ट: त्या फॉर्मचा पहिला फील्ड). तो फील्ड डिलीट केला तरी
शॉर्टलिस्टिंग response च्या internal ID वर आपोआप स्विच होतं — काम थांबत नाही.

**Q: जुने 28 College Response रेकॉर्ड्स कुठे गेले?**
ते "College Responses" नावाच्या पहिल्या फॉर्ममध्ये जसेच्या तसे आहेत — "Your Forms" मध्ये त्या कार्डवर
क्लिक करा.

**Q: Public form ला लॉगिन लागतं का?**
नाही — Google Form सारखी साधी public लिंक आहे. फक्त डॅशबोर्ड (edit/delete) admin key ने संरक्षित आहे.

**Q: एका फॉर्मचा डेटा दुसऱ्या फॉर्मच्या शॉर्टलिस्टमध्ये मिसळेल का?**
नाही — प्रत्येक response ला त्याचा `formId` कायमचा जोडलेला असतो, त्यामुळे प्रत्येक फॉर्मचा डेटा
पूर्णपणे वेगळा राहतो.
