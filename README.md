हो. खाली तुझ्या दिलेल्या पूर्ण माहितीचे **professional English `README.md` version** दिले आहे. हे थेट `README.md` मध्ये copy-paste करू शकतोस.

# Career Katta — Multi-Form Response Dashboard + Live Forms = [https://newupdate-form.onrender.com/dashboard.html]

A complete, self-contained system with an **Admin Dashboard**, **multiple custom Forms** (Student / Principal / Coordinator / etc.), and **Public Response Forms** that are connected live.

> Click **"+ New Form"** from the dashboard to create as many different forms as required (e.g. Student Registration, Principal Registration, Coordinator Registration, etc.).
>
> Every form gets its own unique shareable link. Share the link with users, and whenever someone submits the form, the response immediately appears in that form's own shortlist.
>
> The shortlist automatically displays **only the fields configured for that specific form**. No separate Excel upload/download workflow is required for collecting responses.

---

## 📁 Folder Structure

```text
career-katta-college-responses/
├── server.js                 # Express backend + JSON API (the "brain")
├── package.json
├── data/
│   ├── forms.json            # Every form definition: title, fields, slug, etc.
│   └── responses.json        # Every submitted response, linked to its form
├── public/
│   ├── dashboard.html        # Admin dashboard — form switcher + live response table
│   ├── form.html             # Public shareable response form (?form=<slug>)
│   ├── css/
│   │   └── style.css         # Shared Career Katta navy/gold design system
│   └── js/
│       ├── dashboard.js      # Form switcher + form builder + live polling
│       └── public-form.js    # Renders and submits the selected form
└── README.md
```

---

# ▶️ Run Locally

You need **Node.js 18+** installed.

### 1. Open the project folder

```bash
cd career-katta-college-responses
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the server

```bash
npm start
```

You should see:

```text
Career Katta server running: http://localhost:3000

Admin dashboard : http://localhost:3000/dashboard.html
Public form     : http://localhost:3000/form.html?form=<slug>
Admin key       : career-katta-admin
```

Open:

```text
http://localhost:3000/dashboard.html
```

Your existing **28 College Response records** are already available inside the first form named:

```text
College Responses
```

---

# 🆕 Creating Multiple Forms

The system allows you to create unlimited forms such as:

* Student Registration
* Principal Registration
* Coordinator Registration
* Teacher Registration
* College Registration
* Event Registration
* Internship Registration
* Custom Forms

### Step 1 — Create a New Form

From the dashboard, go to the **Your Forms** panel and click:

```text
+ New Form
```

### Step 2 — Enter Form Title

For example:

```text
Student Registration
```

### Step 3 — Add Fields

You can use the **Quick Start** buttons to instantly add predefined fields for:

* Student
* Principal
* Coordinator

Or click:

```text
+ Add a field
```

to create custom fields.

Each field supports:

* **Label** — e.g. `Student Name`
* **Type** — text / phone / email / textarea / dropdown
* **Required** — whether the field must be completed
* **Filterable** — whether the field should appear as a dashboard filter

For example:

```text
Student Name
Mobile Number
Email Address
College Name
District
Taluka
Course
Year
```

### Step 4 — Create the Form

Click:

```text
Create Form & Get Link
```

A unique permanent shareable URL will be generated.

Example:

```text
http://localhost:3000/form.html?form=student-registration
```

Share this link with students, principals, coordinators, or other users.

Each form stores its responses separately.

---

# 🔗 Form Sharing & Live Data

The system provides a separate live response dashboard for every form.

### 1. Select a Form

Click any form card under:

```text
Your Forms
```

The selected form's live response data will appear below.

### 2. Open or Copy the Form Link

Use the:

```text
↗ Link
```

button on the form card.

### 3. Dynamic Shortlist Columns

The response table automatically uses the fields configured for the selected form.

For example, if a Student Registration form contains:

```text
Name
Mobile
College
District
Taluka
```

the shortlist will automatically display:

| Name | Mobile | College | District | Taluka |
| ---- | ------ | ------- | -------- | ------ |

If another form contains:

```text
Principal Name
College Name
AISHE Code
Mobile
Email
```

only those fields will appear in that form's shortlist.

---

# ⚡ Live Response Updates

When a user submits a public form, the response is automatically detected by the dashboard.

The dashboard polls the server every **6 seconds**.

When new responses arrive:

* A new row appears automatically
* The new row receives a temporary highlight
* A notification toast appears

Example:

```text
🔔 1 new response came in live
```

No manual page refresh is required.

---

# 🔎 Search & Filters

Each form has its own search and filtering system.

### Search

Search responses using the available response data.

### Filterable Fields

When creating a field, enable:

```text
Filterable
```

for fields such as:

* District
* Taluka
* College
* Course
* Year
* Category
* Status

The filter dropdowns work **only for the currently selected form**.

---

# ☑️ Shortlisting Responses

Each response row contains a checkbox.

Select the responses you want to shortlist.

Then click:

```text
Download Shortlisted (.xlsx)
```

Only the selected responses will be exported.

The Excel file contains only:

1. Shortlisted records
2. Fields configured for that form

This keeps each form's exported data clean and independent.

---

# 🖼️ Banner / Flyer Image

Every form can have its own banner or flyer image.

The banner is completely independent for each form.

For example:

```text
Student Registration
    → Student Banner

Principal Registration
    → Principal Banner
```

## Supported Formats

* JPG
* PNG
* WEBP
* GIF

Maximum file size:

```text
4 MB
```

---

## Uploading a Banner

When creating a new form:

1. Create/save the form first.
2. After the form is created, the **Banner / Flyer Image** section becomes available.
3. Select an image.
4. The image is uploaded immediately.

The banner appears at the top of the public form page, before the form title.

Example:

```text
[ College / Event Banner ]

Student Registration

Name
Mobile
College
...
```

---

## Changing a Banner

Select a new image to replace the existing banner.

The previous banner is automatically removed.

You can also click:

```text
🗑 Remove Banner
```

to remove the banner completely.

---

## Banner Storage

Banner images are stored in:

```text
public/uploads/banners/
```

Because the application currently uses the filesystem for storing banners, the same persistence considerations as the JSON data apply.

### Important

If you deploy to hosting with an **ephemeral filesystem**, uploaded banner images may be deleted after redeployment or restart.

For production use, consider:

* Persistent Disk
* Cloudinary
* AWS S3
* Cloudflare R2
* Firebase Storage

---

# ✏️ Edit / Delete Forms

Each form card provides management options.

## Edit Form

Click:

```text
🛠 Edit
```

You can modify:

* Form title
* Fields
* Field types
* Required status
* Filterable status

The form's existing shareable link remains unchanged.

---

## Delete Form

Click:

```text
🗑 Delete
```

A confirmation will be displayed.

Deleting a form permanently removes:

* The form configuration
* All responses belonging to that form
* The form's associated data

Use this option carefully.

---

# ➕ Manual Response Entry

The dashboard also supports:

```text
+ Add Response Manually
```

This is useful when information is received through:

* Phone calls
* WhatsApp
* Offline forms
* Direct communication
* Other sources

An administrator can manually enter the response into the appropriate form.

---

# 🗑️ Delete Responses

Individual responses can be deleted using the delete option on each row.

You can also select multiple shortlisted responses and use:

```text
Bulk Delete
```

to remove them together.

These operations require the admin key.

---

# 📊 Excel Export

The system supports two export methods.

### Shortlisted Export

```text
Download Shortlisted (.xlsx)
```

Downloads only selected responses.

### Full Export

The dashboard also provides an **Old-style Export** option to download the complete response data as an Excel file.

---

# 🔐 Admin Key Security

The admin key protects administrative operations.

It is required for:

* Creating forms
* Editing forms
* Deleting forms
* Uploading banners
* Removing banners
* Adding responses manually
* Deleting responses
* Bulk deleting responses

Public users do **not** need an admin key to submit a form.

Anyone who has a public form link can submit the form, but they cannot access the admin dashboard or manage data.

---

## Change the Admin Key

Before deploying to production, change the default key.

Example:

### Linux / macOS

```bash
ADMIN_KEY="your-secret-here" npm start
```

### Windows PowerShell

```powershell
$env:ADMIN_KEY="your-secret-here"
npm start
```

The default development key is:

```text
career-katta-admin
```

### ⚠️ Important

Never use:

```text
career-katta-admin
```

on a production/live server.

Use a strong, random secret instead.

---

# 🌐 Deployment

The application can run on most Node.js hosting platforms, including:

* Render
* Railway
* VPS
* cPanel with Node.js support
* Other Node.js hosting providers

---

## Deployment Steps

### 1. Upload the project

Upload the complete project folder to your server.

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Set:

```text
ADMIN_KEY=your-secure-admin-key
```

Optionally configure:

```text
PORT=3000
```

### 4. Start the application

```bash
npm start
```

Or use PM2:

```bash
pm2 start server.js
```

### 5. Configure your domain

Point your domain or subdomain to the Node.js application.

For example:

```text
responses.careerkatta.in
```

---

# 🔗 Production URLs

After deployment, your URLs will look like:

### Admin Dashboard

```text
https://responses.careerkatta.in/dashboard.html
```

### Public Form

```text
https://responses.careerkatta.in/form.html?form=student-registration
```

Another example:

```text
https://responses.careerkatta.in/form.html?form=principal-registration
```

Each form has its own unique slug and shareable URL.

---

# 💾 Data Storage

The current system stores data in two JSON files:

```text
data/forms.json
data/responses.json
```

### `forms.json`

Contains form definitions such as:

* Form ID
* Title
* Slug
* Fields
* Field types
* Required settings
* Filterable settings
* Banner information

### `responses.json`

Contains submitted responses.

Each response is permanently associated with its form using:

```text
formId
```

This ensures that responses from different forms never get mixed together.

---

# 📈 Scaling

The current JSON-based storage is simple and easy to deploy.

It can work well for small and moderate workloads.

For very large deployments involving:

* Millions of responses
* Multiple administrators
* High traffic
* Concurrent writes
* Advanced reporting

it is recommended to replace the JSON storage with a proper database such as:

* MongoDB
* PostgreSQL
* MySQL

The existing API structure can be retained while replacing the `readJSON()` and `writeJSON()` logic in `server.js`.

---

# 🔌 API Reference

| Method | Endpoint                               | Authentication | Purpose                            |
| ------ | -------------------------------------- | -------------- | ---------------------------------- |
| GET    | `/api/forms`                           | Public         | Get all forms with response counts |
| GET    | `/api/forms/:idOrSlug`                 | Public         | Get a single form configuration    |
| POST   | `/api/forms`                           | Admin          | Create a new form                  |
| PUT    | `/api/forms/:id`                       | Admin          | Update form title/fields           |
| DELETE | `/api/forms/:id`                       | Admin          | Delete form and its responses      |
| POST   | `/api/forms/:id/banner`                | Admin          | Upload/replace banner image        |
| DELETE | `/api/forms/:id/banner`                | Admin          | Remove banner image                |
| GET    | `/api/forms/:id/responses`             | Public         | Get responses for a form           |
| POST   | `/api/forms/:id/responses`             | Public         | Submit a public form response      |
| POST   | `/api/forms/:id/responses/manual`      | Admin          | Add a response manually            |
| DELETE | `/api/forms/:id/responses/:responseId` | Admin          | Delete a response                  |
| POST   | `/api/forms/:id/responses/bulk-delete` | Admin          | Bulk-delete selected responses     |

---

# 🔑 Admin API Authentication

Admin endpoints require the following HTTP header:

```http
x-admin-key: <your-admin-key>
```

Example:

```http
x-admin-key: your-secret-here
```

Public response submission does not require the admin key.

---

# ❓ FAQ

## Q: Can I create unlimited forms?

Yes.

You can create multiple independent forms such as:

```text
Student Registration
Principal Registration
Coordinator Registration
Teacher Registration
College Registration
Event Registration
```

Each form has its own fields, link, responses, filters, shortlist, and banner.

---

## Q: What happens if I remove the unique field such as AISHE Code?

Each form has its own internal response identification mechanism.

By default, the first field may be treated as the unique field.

If that field is removed, the system automatically falls back to the response's internal ID.

Therefore, shortlisting and response management continue to work.

---

## Q: Where are the old 28 College Response records?

The original 28 College Response records are stored inside the first form:

```text
College Responses
```

Select that form from the **Your Forms** panel to view them.

---

## Q: Does the public form require login?

No.

The public form works like a Google Form.

Anyone with the shareable link can open and submit the form.

Only administrative operations require the admin key.

---

## Q: Can responses from one form appear in another form?

No.

Every response is associated with a specific:

```text
formId
```

Therefore:

```text
Student Registration
        ↓
Student responses only

Principal Registration
        ↓
Principal responses only

Coordinator Registration
        ↓
Coordinator responses only
```

Responses are never mixed between forms.

---

## Q: Do I need to refresh the dashboard when a new response arrives?

No.

The dashboard automatically polls for new responses every **6 seconds**.

New responses appear automatically with a visual highlight and notification.

---

## Q: Can every form have a different banner?

Yes.

Every form stores its own banner independently.

For example:

```text
Student Registration
→ Student Banner

Principal Registration
→ Principal Banner

Coordinator Registration
→ Coordinator Banner
```

---

## Q: Can I edit a form after sharing its link?

Yes.

You can edit the form fields and title from the dashboard.

The existing form slug/link remains unchanged.

---

# 🚀 Main Features

* ✅ Multiple custom forms
* ✅ Unlimited form creation
* ✅ Unique shareable URL for every form
* ✅ Dynamic form builder
* ✅ Student / Principal / Coordinator presets
* ✅ Custom fields
* ✅ Required fields
* ✅ Filterable fields
* ✅ Public form submission
* ✅ Live response updates
* ✅ 6-second polling
* ✅ Dynamic shortlist columns
* ✅ Search
* ✅ Field-based filtering
* ✅ Response selection
* ✅ Shortlisted Excel export
* ✅ Full Excel export
* ✅ Manual response entry
* ✅ Individual response deletion
* ✅ Bulk response deletion
* ✅ Form editing
* ✅ Form deletion
* ✅ Form-specific banners
* ✅ JPG / PNG / WEBP / GIF support
* ✅ Admin key protection
* ✅ JSON-based storage
* ✅ REST API
* ✅ Node.js + Express backend
* ✅ Easy deployment
* ✅ Production-ready architecture with database migration path

---

# 🏗️ Technology Stack

### Frontend

* HTML5
* CSS3
* JavaScript
* Bootstrap / Custom CSS

### Backend

* Node.js
* Express.js

### Storage

* JSON files
* Filesystem-based banner storage

### Export

* XLSX / Excel

### Architecture

```text
                    ┌─────────────────────┐
                    │   Admin Dashboard   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Express Backend   │
                    │      server.js      │
                    └──────────┬──────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
       ┌─────────────────┐          ┌──────────────────┐
       │   forms.json    │          │ responses.json   │
       └─────────────────┘          └──────────────────┘
                ▲                             ▲
                │                             │
                └──────────────┬──────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Public Forms      │
                    │ Student / Principal │
                    │ Coordinator / etc.  │
                    └─────────────────────┘
```

---

# 📌 Project Purpose

The goal of this project is to provide Career Katta with a centralized system for collecting, managing, filtering, shortlisting, and exporting responses from multiple types of forms.

Instead of maintaining separate Google Forms, Excel files, and manual data-management workflows, administrators can create and manage multiple forms from a single dashboard.

```text
Create Form
     ↓
Generate Share Link
     ↓
Share Link
     ↓
User Submits Response
     ↓
Response Stored with formId
     ↓
Live Dashboard Update
     ↓
Search / Filter
     ↓
Shortlist
     ↓
Export to Excel
```

---

# 🔒 Production Recommendations

Before making the system publicly available:

1. Change the default admin key.
2. Use HTTPS.
3. Use a persistent disk for JSON data and uploaded banners.
4. Configure regular backups.
5. Restrict access to the admin dashboard where appropriate.
6. Consider rate limiting for public form submissions.
7. Add CAPTCHA/anti-spam protection if forms receive high public traffic.
8. For large-scale usage, migrate JSON storage to MongoDB or PostgreSQL.
9. Store sensitive production secrets only in environment variables.
10. Use cloud/object storage for production banner images.

---

# 📄 License

This project is developed for the **Career Katta** initiative and its associated response-management workflows.
