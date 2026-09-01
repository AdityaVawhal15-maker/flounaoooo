// The published policy set, as data.
//
// Generated from the source documents in the company policy folder rather than
// retyped, because the page a customer reads has to BE the policy and not a
// paraphrase of it. Retyping 40,000 words by hand introduces differences
// between what the company wrote and what it published, and those differences
// are exactly what a policy review looks for.
//
// To amend a policy: edit the source document, re-run the converter, and bump
// POLICY_VERSION in the server's policy.ts so existing users are asked to
// accept the new text.
//
// Some claims in the source are corrected in `corrections.ts` before they are
// shown. See that file for what was changed and why.

export type Block =
  | { t: "h"; level: number; text: string }
  | { t: "p"; text: string }
  | { t: "ul"; items: string[] }
  | { t: "table"; head: string[]; rows: string[][] };

export type PolicyDocument = {
  slug: string;
  title: string;
  description: string;
  blocks: Block[];
};

export const POLICY_DOCUMENTS: PolicyDocument[] = [
  {
    "slug": "privacy",
    "title": "Privacy Policy",
    "description": "How Flouna collects, uses, shares and protects your information.",
    "blocks": [
      {
        "t": "h",
        "level": 2,
        "text": "1. INTRODUCTION"
      },
      {
        "t": "p",
        "text": "Welcome to Algorithec (\"we,\" \"us,\" \"our,\" or \"Company\"). Algorithec PRIVATE LIMITED (\"Algorithec\") is committed to protecting your privacy and ensuring you have a positive experience on our platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website, mobile application, and related services (collectively, the \"Platform\")."
      },
      {
        "t": "p",
        "text": "Algorithec is an AI-driven Decision Engine that helps users instantly choose and complete the best possible option for shopping, food, rides, travel, and hospitality without switching between multiple applications."
      },
      {
        "t": "p",
        "text": "<b>Please read this Privacy Policy carefully.</b> If you do not agree with our policies and practices, please do not use our Platform."
      },
      {
        "t": "h",
        "level": 2,
        "text": "2. INFORMATION WE COLLECT"
      },
      {
        "t": "h",
        "level": 3,
        "text": "2.1 Information You Provide Directly"
      },
      {
        "t": "p",
        "text": "<b>Account Registration Information:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Full name",
          "Email address",
          "Phone number",
          "Password (encrypted)",
          "Date of birth",
          "Profile picture (optional)",
          "Gender (optional)",
          "Preferred language"
        ]
      },
      {
        "t": "p",
        "text": "<b>Payment Information:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Bank account details (for refunds/returns)",
          "Credit/debit card information (processed securely through third-party payment gateways)",
          "UPI ID (if applicable)",
          "Billing address",
          "Transaction history"
        ]
      },
      {
        "t": "p",
        "text": "<b>Location Information:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Current location (when you use location-based services)",
          "Saved addresses (home, work, favorites)",
          "Search history based on location",
          "Delivery/pickup preferences"
        ]
      },
      {
        "t": "p",
        "text": "<b>Commerce & Service Information:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Shopping preferences and history",
          "Food delivery preferences and orders",
          "Ride/transportation preferences",
          "Travel bookings and preferences",
          "Hotel/hospitality reservations",
          "Wishlist and saved items",
          "Reviews, ratings, and feedback"
        ]
      },
      {
        "t": "p",
        "text": "<b>Communication Information:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Messages and support tickets",
          "Feedback and surveys",
          "Customer service interactions",
          "Push notification preferences",
          "Email communication preferences"
        ]
      },
      {
        "t": "p",
        "text": "<b>KYC & Verification:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Government-issued ID documents (Aadhar, PAN, Passport, etc.)",
          "Address proof documents",
          "Bank account verification details",
          "Photo for identity verification (optional but may be required)"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "2.2 Information Collected Automatically"
      },
      {
        "t": "p",
        "text": "<b>Device Information:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Device type (smartphone, tablet, desktop)",
          "Operating system and version",
          "Device identifiers (IMEI, Android ID, IDFA)",
          "Mobile network information",
          "Device settings and specifications"
        ]
      },
      {
        "t": "p",
        "text": "<b>Usage Information:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Pages/screens visited",
          "Features used",
          "Search queries and filters applied",
          "Time spent on Platform",
          "Clicks and interactions",
          "Error logs and crash reports",
          "Session duration",
          "User journey and flow"
        ]
      },
      {
        "t": "p",
        "text": "<b>Location Data:</b>"
      },
      {
        "t": "ul",
        "items": [
          "GPS coordinates (when location services enabled)",
          "IP address and geolocation",
          "Approximate location based on network data",
          "Location history for completed transactions"
        ]
      },
      {
        "t": "p",
        "text": "<b>Cookies and Tracking:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Session cookies",
          "Persistent cookies",
          "Analytics cookies",
          "Advertising cookies",
          "Pixels and tags",
          "Local storage data"
        ]
      },
      {
        "t": "p",
        "text": "<b>AI/ML Training Data (Anonymized):</b>"
      },
      {
        "t": "ul",
        "items": [
          "Decision patterns (what users selected)",
          "Search behavior",
          "Preference signals",
          "Time patterns",
          "Category preferences",
          "Budget ranges",
          "Quality signals"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "2.3 Information from Third Parties"
      },
      {
        "t": "p",
        "text": "<b>Commerce Partners:</b>"
      },
      {
        "t": "ul",
        "items": [
          "ONDC sellers and service providers",
          "E-commerce platforms (Amazon, Flipkart, etc.)",
          "Food delivery platforms (Swiggy, Zomato, etc.)",
          "Ride-hailing services (Uber, Ola, etc.)",
          "Travel platforms (MakeMyTrip, Goibibo, etc.)",
          "Hotel booking platforms (OYO, Airbnb, etc.)"
        ]
      },
      {
        "t": "p",
        "text": "<b>Information Received:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Transaction details (order ID, amount, status)",
          "Item information (product details, prices, descriptions)",
          "Seller/service provider information",
          "Delivery/fulfillment tracking",
          "Reviews and ratings",
          "Refund and return information"
        ]
      },
      {
        "t": "p",
        "text": "<b>Payment Gateways:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Transaction confirmation",
          "Payment status",
          "Card/bank verification results"
        ]
      },
      {
        "t": "p",
        "text": "<b>Third-Party Integrations:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Analytics providers (Google Analytics, Mixpanel, etc.)",
          "Error tracking services (Sentry, Rollbar, etc.)",
          "Push notification services",
          "Email service providers",
          "SMS service providers"
        ]
      },
      {
        "t": "p",
        "text": "<b>Social Media (if connected):</b>"
      },
      {
        "t": "ul",
        "items": [
          "Basic profile information",
          "Email address",
          "Profile picture",
          "Friends/connections list"
        ]
      },
      {
        "t": "p",
        "text": "<b>Public Sources:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Public reviews and ratings",
          "Social media mentions",
          "Market research data",
          "News and industry data"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "3. HOW WE USE YOUR INFORMATION"
      },
      {
        "t": "h",
        "level": 3,
        "text": "3.1 Core Platform Functions"
      },
      {
        "t": "p",
        "text": "<b>To Provide the Service:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Process your requests to find best options across platforms",
          "Generate AI-powered recommendations",
          "Complete transactions on your behalf",
          "Auto-apply discounts and offers",
          "Track orders and deliveries",
          "Process refunds and returns",
          "Customer support and issue resolution"
        ]
      },
      {
        "t": "p",
        "text": "<b>AI/Decision Engine:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Train machine learning models to improve recommendations",
          "Understand user intent through NLP",
          "Evaluate options across platforms",
          "Predict user preferences",
          "Optimize decision accuracy",
          "A/B test different decision algorithms",
          "Learn from user feedback"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "3.2 Communication"
      },
      {
        "t": "p",
        "text": "<b>Transactional Communications:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Order confirmations",
          "Delivery updates",
          "Payment receipts",
          "Support responses",
          "Account notifications",
          "Security alerts",
          "Policy updates"
        ]
      },
      {
        "t": "p",
        "text": "<b>Marketing Communications:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Promotional offers and discounts",
          "New feature announcements",
          "Product recommendations",
          "Event invitations",
          "Newsletter content",
          "Feedback surveys",
          "Re-engagement campaigns"
        ]
      },
      {
        "t": "p",
        "text": "<b>You can opt-out of non-essential marketing communications at any time.</b>"
      },
      {
        "t": "h",
        "level": 3,
        "text": "3.3 Analytics & Improvement"
      },
      {
        "t": "p",
        "text": "<b>Service Improvement:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Analyze user behavior patterns",
          "Identify popular categories and options",
          "Understand decision patterns",
          "Improve recommendation accuracy",
          "Optimize user experience",
          "Test new features",
          "Identify and fix bugs"
        ]
      },
      {
        "t": "p",
        "text": "<b>Business Analytics:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Usage statistics and trends",
          "Conversion metrics",
          "Revenue analysis",
          "User segmentation",
          "Funnel analysis",
          "Cohort analysis",
          "Performance metrics"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "3.4 Safety & Security"
      },
      {
        "t": "p",
        "text": "<b>Account Security:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Detect and prevent fraud",
          "Verify user identity",
          "Detect unauthorized access",
          "Monitor suspicious activities",
          "Enforce security policies",
          "Investigate security incidents"
        ]
      },
      {
        "t": "p",
        "text": "<b>Compliance:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Comply with legal obligations",
          "Respond to legal requests",
          "Enforce terms and conditions",
          "Protect rights and property",
          "Prevent illegal activities",
          "Tax compliance",
          "Regulatory requirements"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "3.5 Personalization"
      },
      {
        "t": "p",
        "text": "<b>User Experience:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Customize recommendations",
          "Remember preferences",
          "Personalize interface",
          "Suggest relevant features",
          "Optimize content presentation"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "4. HOW WE SHARE YOUR INFORMATION"
      },
      {
        "t": "h",
        "level": 3,
        "text": "4.1 Service Partners"
      },
      {
        "t": "p",
        "text": "<b>Necessary for Transactions:</b>"
      },
      {
        "t": "ul",
        "items": [
          "ONDC sellers to complete orders",
          "Payment gateway providers to process payments",
          "Delivery partners to track shipments",
          "Service providers to fulfill requests",
          "Logistics partners for delivery"
        ]
      },
      {
        "t": "p",
        "text": "<b>Information Shared:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Your name and contact details",
          "Delivery address",
          "Order details",
          "Payment status",
          "Customer support information"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "4.2 Affiliate & Referral Partners"
      },
      {
        "t": "p",
        "text": "<b>When You Use Referral Links:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Affiliate networks receive transaction data",
          "Partner platforms receive your referral information",
          "Commission tracking information",
          "Conversion data"
        ]
      },
      {
        "t": "p",
        "text": "<b>You Can Opt-Out:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Choose not to use referral links",
          "Request non-affiliate transactions"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "4.3 Analytics & Service Providers"
      },
      {
        "t": "p",
        "text": "<b>Analytics Providers:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Google Analytics",
          "Mixpanel",
          "Amplitude",
          "Aggregated, anonymized usage data"
        ]
      },
      {
        "t": "p",
        "text": "<b>Technical Service Providers:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Cloud hosting providers (AWS, Google Cloud, etc.)",
          "Error tracking services",
          "Communication service providers",
          "Payment processors"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "4.4 Legal & Regulatory"
      },
      {
        "t": "p",
        "text": "<b>Law Enforcement:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Comply with legal requests",
          "Court orders",
          "Government agency requests",
          "Regulatory investigations",
          "As required by law"
        ]
      },
      {
        "t": "p",
        "text": "<b>Information Shared:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Only minimal information necessary",
          "With judicial orders or legal process",
          "As required by applicable law"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "4.5 Business Transfers"
      },
      {
        "t": "p",
        "text": "<b>In Case of Merger/Acquisition:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Buyer may acquire user information",
          "Subject to this Privacy Policy or updated policy",
          "You will be notified of changes",
          "Right to opt-out in some circumstances"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "4.6 Public Information"
      },
      {
        "t": "p",
        "text": "<b>With Your Consent:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Public reviews and ratings",
          "User testimonials",
          "Anonymized usage statistics",
          "Case studies (anonymized)"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "5. DATA PROTECTION & SECURITY"
      },
      {
        "t": "h",
        "level": 3,
        "text": "5.1 Security Measures"
      },
      {
        "t": "p",
        "text": "<b>Technical Security:</b>"
      },
      {
        "t": "ul",
        "items": [
          "SSL/TLS encryption for data in transit",
          "AES-256 encryption for data at rest",
          "Secure authentication (multi-factor authentication available)",
          "Regular security audits",
          "Penetration testing",
          "Vulnerability scanning",
          "Intrusion detection systems"
        ]
      },
      {
        "t": "p",
        "text": "<b>Access Controls:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Role-based access control",
          "Principle of least privilege",
          "Access logging and monitoring",
          "Authentication and authorization",
          "Restricted data access",
          "Employee background checks",
          "Confidentiality agreements"
        ]
      },
      {
        "t": "p",
        "text": "<b>Data Management:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Secure data storage",
          "Backup and recovery systems",
          "Data retention policies",
          "Secure deletion procedures",
          "Regular security training",
          "Incident response plan"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "5.2 Data Retention"
      },
      {
        "t": "p",
        "text": "<b>User Account Data:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Retained for duration of account",
          "12 months after account deletion (for legal/tax purposes)",
          "Deleted upon request where legally permitted"
        ]
      },
      {
        "t": "p",
        "text": "<b>Transaction Data:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Retained for 7 years (tax and regulatory compliance)",
          "Earlier deletion upon request where permitted"
        ]
      },
      {
        "t": "p",
        "text": "<b>Analytics & Logs:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Retained for 12-24 months",
          "Older data automatically deleted",
          "Real-time data processed and aggregated"
        ]
      },
      {
        "t": "p",
        "text": "<b>AI/ML Training Data:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Anonymized and aggregated",
          "No personal identifiers",
          "Retained for model improvement",
          "Can be removed upon request"
        ]
      },
      {
        "t": "p",
        "text": "<b>Marketing Data:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Retained until opted out",
          "3 months grace period after opt-out",
          "Deleted upon request"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "5.3 International Data Transfers"
      },
      {
        "t": "p",
        "text": "<b>Data Location:</b>"
      },
      {
        "t": "ul",
        "items": [
          "User data primarily stored in India",
          "Backups may be stored in multiple regions",
          "Complies with India data protection laws",
          "May comply with international data transfer agreements"
        ]
      },
      {
        "t": "p",
        "text": "<b>Your Rights:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Request location of your data",
          "Request local data storage",
          "Opt-out of international transfers where possible"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "6. YOUR PRIVACY RIGHTS & CHOICES"
      },
      {
        "t": "h",
        "level": 3,
        "text": "6.1 Access & Portability"
      },
      {
        "t": "p",
        "text": "<b>Right to Access:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Request copy of your personal data",
          "Understand how data is processed",
          "Request within 30 days",
          "Format: Digital, PDF, or print",
          "Free of charge (one request per year)"
        ]
      },
      {
        "t": "p",
        "text": "<b>Right to Data Portability:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Receive data in structured, portable format",
          "Transfer to another service",
          "Request within 30 days",
          "Includes transaction history and preferences"
        ]
      },
      {
        "t": "p",
        "text": "<b>How to Request:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Email: privacy@algorithec.ai",
          "In-app request form",
          "Support ticket",
          "Include identification details"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "6.2 Correction & Deletion"
      },
      {
        "t": "p",
        "text": "<b>Right to Correction:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Update inaccurate information",
          "Correct outdated data",
          "Remove incomplete data",
          "Via account settings",
          "Or email privacy@algorithec.ai"
        ]
      },
      {
        "t": "p",
        "text": "<b>Right to Deletion (\"Right to be Forgotten\"):</b>"
      },
      {
        "t": "ul",
        "items": [
          "Request permanent deletion of data",
          "Exceptions: legal/regulatory requirements",
          "Tax compliance (7 years for transactions)",
          "Fraud prevention",
          "30-45 days for processing",
          "Anonymization of some data may be retained"
        ]
      },
      {
        "t": "p",
        "text": "<b>Irreversible:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Account will be permanently deleted",
          "Cannot be recovered",
          "Data cannot be restored",
          "Consider download before deletion"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "6.3 Opt-Out Options"
      },
      {
        "t": "p",
        "text": "<b>Marketing Communications:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Unsubscribe from emails",
          "Disable push notifications",
          "SMS opt-out",
          "Settings Notifications"
        ]
      },
      {
        "t": "p",
        "text": "<b>Cookies & Tracking:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Disable cookies in browser settings",
          "Do not track (DNT) signals honored",
          "Clear cookies anytime",
          "May affect functionality"
        ]
      },
      {
        "t": "p",
        "text": "<b>Analytics:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Opt-out of Google Analytics",
          "Disable event tracking",
          "Settings Privacy"
        ]
      },
      {
        "t": "p",
        "text": "<b>Location Services:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Disable GPS in device settings",
          "Don't allow location permission",
          "Disable location-based recommendations",
          "Note: May reduce service quality"
        ]
      },
      {
        "t": "p",
        "text": "<b>Third-Party Sharing:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Opt-out of referral partnerships",
          "Request non-affiliate transactions",
          "Email: privacy@algorithec.ai"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "6.4 AI/ML Model Training"
      },
      {
        "t": "p",
        "text": "<b>Opt-Out of Training:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Request to exclude your data from ML training",
          "Your data won't be used to improve models",
          "Email: privacy@algorithec.ai",
          "Takes effect within 30 days",
          "May affect recommendation quality"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "7. COOKIES & TRACKING TECHNOLOGIES"
      },
      {
        "t": "h",
        "level": 3,
        "text": "7.1 How We Use Cookies"
      },
      {
        "t": "p",
        "text": "<b>Essential Cookies:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Session management",
          "Authentication",
          "Security functions",
          "Required for platform functionality",
          "Cannot be disabled"
        ]
      },
      {
        "t": "p",
        "text": "<b>Analytics Cookies:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Track user behavior",
          "Measure feature usage",
          "Analyze performance",
          "Improve experience",
          "Can be disabled"
        ]
      },
      {
        "t": "p",
        "text": "<b>Advertising Cookies:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Personalized recommendations",
          "Behavioral targeting",
          "Cross-platform tracking (with permission)",
          "Can be disabled"
        ]
      },
      {
        "t": "p",
        "text": "<b>Social Media Cookies:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Enable social sharing",
          "Login via social accounts",
          "Track social referrals"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "7.2 Cookie Management"
      },
      {
        "t": "p",
        "text": "<b>Browser Controls:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Delete cookies anytime",
          "Disable cookies in settings",
          "Use private/incognito browsing",
          "Third-party cookie controls"
        ]
      },
      {
        "t": "p",
        "text": "<b>Our Cookie Management:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Cookie consent banner on first visit",
          "Preferences panel in settings",
          "Granular control over each category",
          "Annual consent renewal"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "7.3 Web Beacons & Pixels"
      },
      {
        "t": "p",
        "text": "<b>Usage:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Track email opens",
          "Measure campaign effectiveness",
          "Conversion tracking",
          "Cross-site activity",
          "Retargeting"
        ]
      },
      {
        "t": "p",
        "text": "<b>Control:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Disable images in email client",
          "Use email privacy tools",
          "Opt-out of tracking"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "8. CHILDREN'S PRIVACY"
      },
      {
        "t": "h",
        "level": 3,
        "text": "8.1 Age Restrictions"
      },
      {
        "t": "p",
        "text": "<b>Minimum Age:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Must be 18+ to use platform",
          "Or legal age of majority in your jurisdiction",
          "Parental consent not obtained for under-18"
        ]
      },
      {
        "t": "p",
        "text": "<b>Minors (Under 18):</b>"
      },
      {
        "t": "ul",
        "items": [
          "Should not register",
          "Should not provide information",
          "Parents may request deletion",
          "We will comply with deletion requests"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "8.2 Parent/Guardian Rights"
      },
      {
        "t": "p",
        "text": "<b>If Minor Has Account:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Contact: privacy@algorithec.ai",
          "Provide proof of custody",
          "Request account deletion",
          "Request data deletion",
          "Receive data copy"
        ]
      },
      {
        "t": "p",
        "text": "<b>We Will Not:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Knowingly collect data from minors",
          "Target marketing to minors",
          "Share data with third parties (except legal)",
          "Use data for behavioral tracking"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "9. THIRD-PARTY LINKS & SERVICES"
      },
      {
        "t": "h",
        "level": 3,
        "text": "9.1 External Links"
      },
      {
        "t": "p",
        "text": "<b>Not Our Responsibility:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Links to partner platforms",
          "Third-party websites",
          "Other services",
          "E-commerce sites",
          "ONDC sellers"
        ]
      },
      {
        "t": "p",
        "text": "<b>Their Privacy Policies Apply:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Not our policies",
          "Review their privacy policy",
          "Your interactions governed by their terms",
          "We are not responsible for their practices"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "9.2 OAuth & Social Login"
      },
      {
        "t": "p",
        "text": "<b>If You Connect Social Account:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Facebook, Google, Apple, etc.",
          "Basic profile information accessed",
          "Email and name typically required",
          "Permissions requested during signup",
          "Can disconnect anytime in settings"
        ]
      },
      {
        "t": "p",
        "text": "<b>Data Shared:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Limited to what you authorize",
          "Profile information",
          "Email address",
          "May not include all profile data",
          "Review what's shared during signup"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "10. INDIA DATA PROTECTION COMPLIANCE"
      },
      {
        "t": "h",
        "level": 3,
        "text": "10.1 Indian Laws"
      },
      {
        "t": "p",
        "text": "<b>Digital Personal Data Protection Act (DPDP), 2023:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Compliant with new Indian data protection law",
          "Your data is personal data under DPDP",
          "We are Data Fiduciary",
          "Partners are Data Processors"
        ]
      },
      {
        "t": "p",
        "text": "<b>IT Act, 2000:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Compliant with Information Technology Act",
          "Reasonable security measures",
          "Incident reporting requirements"
        ]
      },
      {
        "t": "p",
        "text": "<b>Right to Privacy:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Constitutional right recognized in India",
          "Compliant with India's privacy framework",
          "Your rights under Indian law"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "10.2 Your Rights Under Indian Law"
      },
      {
        "t": "p",
        "text": "<b>DPDP Rights:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Right to know personal data",
          "Right to correct/update",
          "Right to erasure (exceptions apply)",
          "Right to data portability",
          "Right to withdraw consent",
          "Right to grievance redressal"
        ]
      },
      {
        "t": "p",
        "text": "<b>Our Obligations:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Process data lawfully",
          "Data minimization",
          "Purpose limitation",
          "Accuracy and retention",
          "Security and integrity",
          "Accountability and transparency"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "10.3 Grievance Redressal"
      },
      {
        "t": "p",
        "text": "<b>If Your Rights Violated:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Email: privacy@algorithec.ai",
          "Subject: Data Protection Grievance",
          "Describe the issue",
          "Provide supporting documents",
          "30 days to acknowledge",
          "45 days to resolve",
          "No fees charged"
        ]
      },
      {
        "t": "p",
        "text": "<b>Escalation:</b>"
      },
      {
        "t": "ul",
        "items": [
          "If not satisfied",
          "Contact DPA (Data Protection Authority) when established",
          "Legal remedies available"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "11. GDPR COMPLIANCE (If Applicable)"
      },
      {
        "t": "h",
        "level": 3,
        "text": "11.1 For EU Residents"
      },
      {
        "t": "p",
        "text": "<b>GDPR Applies if:</b>"
      },
      {
        "t": "ul",
        "items": [
          "You are in EU/EEA",
          "Or you are EU resident",
          "Or EU data protection rights apply"
        ]
      },
      {
        "t": "p",
        "text": "<b>Your Rights:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Right to access",
          "Right to rectification",
          "Right to erasure",
          "Right to restrict processing",
          "Right to data portability",
          "Right to object",
          "Rights related to automated decisions",
          "Right to lodge complaint"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "11.2 Legal Basis"
      },
      {
        "t": "p",
        "text": "<b>We Process Data Based On:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Your consent",
          "Contract performance",
          "Legal obligations",
          "Legitimate interests",
          "Protection of vital interests",
          "Public tasks"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "12. CHANGES TO PRIVACY POLICY"
      },
      {
        "t": "h",
        "level": 3,
        "text": "12.1 Updates & Notifications"
      },
      {
        "t": "p",
        "text": "<b>How We Notify:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Email notification",
          "In-app notification",
          "Website banner",
          "Major changes: 30 days notice"
        ]
      },
      {
        "t": "p",
        "text": "<b>Your Consent:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Continued use = acceptance",
          "Right to withdraw consent",
          "Request data deletion if disagree",
          "Some changes may require explicit consent"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "12.2 Archival"
      },
      {
        "t": "p",
        "text": "<b>Previous Versions:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Maintained for reference",
          "Available upon request",
          "Shows privacy evolution",
          "Transparency purposes"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "13. SECURITY INCIDENT NOTIFICATION"
      },
      {
        "t": "h",
        "level": 3,
        "text": "13.1 Breach Response"
      },
      {
        "t": "p",
        "text": "<b>If Your Data Breached:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Investigate immediately",
          "Notify you within 72 hours",
          "Details: what data, when, what to do",
          "Notify authorities if required",
          "Provide identity protection"
        ]
      },
      {
        "t": "p",
        "text": "<b>Information Provided:</b>"
      },
      {
        "t": "ul",
        "items": [
          "What happened",
          "What data affected",
          "What we're doing",
          "How to protect yourself",
          "Contact for more info"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "13.2 Prevention"
      },
      {
        "t": "p",
        "text": "<b>We Will:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Take reasonable steps to prevent breaches",
          "Regular security audits",
          "Employee training",
          "Secure systems",
          "Incident response plan",
          "Data encryption",
          "Access controls"
        ]
      },
      {
        "t": "p",
        "text": "<b>You Should:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Use strong passwords",
          "Enable 2FA",
          "Keep device updated",
          "Don't share credentials",
          "Report suspicious activity"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "14. CONTACT INFORMATION"
      },
      {
        "t": "h",
        "level": 3,
        "text": "14.1 Privacy Questions"
      },
      {
        "t": "p",
        "text": "<b>Privacy Officer:</b> <b>Name:</b> Privacy Compliance Team <b>Email:</b> privacy@algorithec.ai <b>Phone:</b> +91 7396144250 <b>Website:</b> www.algorithec.ai"
      },
      {
        "t": "p",
        "text": "<b>Response Time:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Within 24 business hours for queries",
          "30 days for access requests",
          "45 days for deletion requests",
          "30 days for correction requests"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "14.2 Mailing Address"
      },
      {
        "t": "p",
        "text": "<b>ALGORITHEC PRIVATE LIMITED</b> Unit 101, Oxford Towers, 139/88, Hal Old Airport RD, H.A.L II Stage, Bangalore North, Bangalore - 560008, Karnataka, India"
      },
      {
        "t": "h",
        "level": 3,
        "text": "14.3 Data Protection Officer"
      },
      {
        "t": "p",
        "text": "<b>Will be appointed as required by:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Indian data protection law",
          "GDPR (if processing EU data)",
          "Other applicable regulations"
        ]
      },
      {
        "t": "p",
        "text": "<b>Contact details will be updated on website.</b>"
      },
      {
        "t": "h",
        "level": 2,
        "text": "15. GRIEVANCE REDRESSAL OFFICER"
      },
      {
        "t": "p",
        "text": "<b>For Platform Complaints:</b> <b>Name:</b> Grievance Officer <b>Email:</b> grievance@algorithec.ai <b>Phone:</b> +91 7396144250 <b>Hours:</b> Monday-Friday, 10 AM - 6 PM IST"
      },
      {
        "t": "p",
        "text": "<b>Process:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Submit complaint with details",
          "Acknowledge within 24 hours",
          "Investigate within 30 days",
          "Respond with resolution",
          "Escalate if not satisfied"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "16. DISCLAIMER & LIABILITY"
      },
      {
        "t": "h",
        "level": 3,
        "text": "16.1 Limited Liability"
      },
      {
        "t": "p",
        "text": "<b>We Are Not Liable For:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Unauthorized third-party access despite reasonable measures",
          "Your failure to protect password",
          "Your shared login credentials",
          "Browser cookies or malware",
          "Internet/network issues",
          "Service interruptions (outside our control)",
          "Unauthorized disclosures of information"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "16.2 Your Responsibility"
      },
      {
        "t": "p",
        "text": "<b>You Must:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Keep password confidential",
          "Don't share login credentials",
          "Notify us of unauthorized access",
          "Update contact information",
          "Review account regularly",
          "Report suspicious activity",
          "Update device security"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "17. ACKNOWLEDGMENT"
      },
      {
        "t": "p",
        "text": "By using Algorithec, you acknowledge that:"
      },
      {
        "t": "p",
        "text": "You have read and understood this Privacy Policy You consent to our collection and use of information You are 18+ years old (or legal age of majority) You understand your privacy rights You agree to our data handling practices You will notify us of inaccuracies You will report security concerns"
      },
      {
        "t": "h",
        "level": 2,
        "text": "18. FINAL PROVISIONS"
      },
      {
        "t": "h",
        "level": 3,
        "text": "18.1 Severability"
      },
      {
        "t": "p",
        "text": "If any provision is found invalid, remaining provisions stay in effect."
      },
      {
        "t": "h",
        "level": 3,
        "text": "18.2 Entire Agreement"
      },
      {
        "t": "p",
        "text": "This Privacy Policy, combined with Terms of Service, constitutes entire agreement regarding privacy and data handling."
      },
      {
        "t": "h",
        "level": 3,
        "text": "18.3 Governing Law"
      },
      {
        "t": "p",
        "text": "This Privacy Policy governed by laws of India, without regard to conflicts."
      },
      {
        "t": "h",
        "level": 3,
        "text": "18.4 Dispute Resolution"
      },
      {
        "t": "p",
        "text": "Disputes resolved through:"
      },
      {
        "t": "ul",
        "items": [
          "Negotiation and good faith discussions",
          "Mediation (if agreed)",
          "Arbitration under Indian Arbitration Act",
          "Courts of Bangalore (if litigation necessary)"
        ]
      },
      {
        "t": "p",
        "text": "<b>© 2026 ALGORITHEC PRIVATE LIMITED. All Rights Reserved.</b>"
      },
      {
        "t": "p",
        "text": "<b>Last Updated: May 28, 2026</b> <b>Next Review: May 28, 2027</b>"
      },
      {
        "t": "p",
        "text": "For questions or concerns about privacy practices, contact: <b>Email:</b> privacy@algorithec.ai <b>Phone:</b> +91 7396144250 <b>Website:</b> www.algorithec.ai"
      },
      {
        "t": "p",
        "text": "<b>END OF PRIVACY POLICY</b>"
      }
    ]
  },
  {
    "slug": "terms",
    "title": "Terms of Service",
    "description": "The agreement between you and Algorithec when you use Flouna.",
    "blocks": [
      {
        "t": "h",
        "level": 2,
        "text": "1. ACCEPTANCE OF TERMS"
      },
      {
        "t": "p",
        "text": "Welcome to Algorithec (\"Platform,\" \"Service,\" \"Website,\" \"App\"). These Terms of Service (\"Terms\") constitute a legally binding agreement between you (\"User,\" \"You\") and Algorithec Private Limited (\"Company,\" \"We,\" \"Us,\" \"Our\")."
      },
      {
        "t": "p",
        "text": "<b>By accessing, browsing, or using Algorithec, you:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Accept these Terms in their entirety",
          "Agree to be bound by these Terms",
          "Agree to comply with all applicable laws",
          "Certify you have legal capacity to enter agreements"
        ]
      },
      {
        "t": "p",
        "text": "<b>If you do not accept these Terms, do not use the Platform.</b>"
      },
      {
        "t": "h",
        "level": 2,
        "text": "2. DESCRIPTION OF SERVICE"
      },
      {
        "t": "h",
        "level": 3,
        "text": "2.1 What Algorithec Does"
      },
      {
        "t": "p",
        "text": "Algorithec is an AI-driven Decision Engine that:"
      },
      {
        "t": "ul",
        "items": [
          "<b>Understands your intent</b> - You tell us what you want (e.g., \"order biryani under ₹200 near me\")",
          "<b>Evaluates all options</b> - AI searches across ONDC and partner platforms for best options",
          "<b>Makes the decision</b> - Ranks by price, reliability, delivery time, and satisfaction signals",
          "<b>Applies all discounts</b> - Auto-applies bank offers, coupons, and cashback",
          "<b>Executes the transaction</b> - Completes purchase on your behalf",
          "<b>Tracks delivery</b> - Monitors status and notifications throughout fulfillment"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "2.2 Supported Categories"
      },
      {
        "t": "p",
        "text": "Currently available across:"
      },
      {
        "t": "ul",
        "items": [
          "<b>Shopping</b> - Amazon, Flipkart, Myntra, ONDC",
          "<b>Food Delivery</b> - Swiggy, Zomato, AIPP, ONDC",
          "<b>Rides</b> - Uber, Ola, Rapido",
          "<b>Travel</b> - MakeMyTrip, Goibibo, RedBus, ONDC",
          "<b>Hospitality</b> - OYO, Airbnb, Booking.com, ONDC"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "2.3 Service Availability"
      },
      {
        "t": "p",
        "text": "<b>Geographic Availability:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Currently available in: Bangalore (expanding to other cities)",
          "Availability varies by category and partner availability",
          "Check Platform for your location's coverage"
        ]
      },
      {
        "t": "p",
        "text": "<b>Time Availability:</b>"
      },
      {
        "t": "ul",
        "items": [
          "24/7 platform availability (subject to downtime for maintenance)",
          "Partner platform hours may vary",
          "You will be notified of service interruptions"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "3. ELIGIBILITY & ACCOUNT REGISTRATION"
      },
      {
        "t": "h",
        "level": 3,
        "text": "3.1 Eligibility Requirements"
      },
      {
        "t": "p",
        "text": "You must be:"
      },
      {
        "t": "ul",
        "items": [
          "<b>Age:</b> 18+ years old (or legal age of majority in your jurisdiction)",
          "<b>Capacity:</b> Have legal capacity to enter binding agreements",
          "<b>Jurisdiction:</b> From India (currently)",
          "<b>Not Prohibited:</b> Not prohibited from using the Platform",
          "<b>Terms Acceptance:</b> Accept all Terms and conditions"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "3.2 Account Registration"
      },
      {
        "t": "p",
        "text": "<b>To Register, Provide:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Full name",
          "Valid email address",
          "Valid phone number",
          "Secure password (at least 8 characters, mixed case & numbers recommended)",
          "Date of birth (to verify age)",
          "Accept Terms and Privacy Policy"
        ]
      },
      {
        "t": "p",
        "text": "<b>Registration Obligations:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Provide accurate, current information",
          "Update information if it changes",
          "Maintain password confidentiality",
          "Notify us of unauthorized access",
          "You are responsible for all activity on your account"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "3.3 Account Suspension/Termination"
      },
      {
        "t": "p",
        "text": "We may suspend or terminate your account if:"
      },
      {
        "t": "ul",
        "items": [
          "You violate these Terms",
          "You provide false information",
          "You engage in fraudulent activity",
          "You violate applicable laws",
          "You misuse the Platform",
          "You harm other users",
          "Suspicious activity detected",
          "Non-use for 12+ months"
        ]
      },
      {
        "t": "p",
        "text": "<b>Your Rights:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Right to know reason for suspension",
          "Right to appeal within 30 days",
          "Account data deletion upon request",
          "Refund of unused credits (if applicable)"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "4. USER RESPONSIBILITIES & PROHIBITED CONDUCT"
      },
      {
        "t": "h",
        "level": 3,
        "text": "4.1 Your Responsibilities"
      },
      {
        "t": "p",
        "text": "You agree to:"
      },
      {
        "t": "ul",
        "items": [
          "Use Platform only for personal, non-commercial purposes",
          "Comply with all applicable laws and regulations",
          "Respect others' intellectual property rights",
          "Not interfere with Platform operations",
          "Maintain confidentiality of credentials",
          "Report suspicious activity",
          "Accept recommendations made by AI",
          "Verify AI recommendations before accepting",
          "Use accurate information for KYC"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "4.2 Prohibited Conduct"
      },
      {
        "t": "p",
        "text": "You must not:"
      },
      {
        "t": "p",
        "text": "<b>Illegal Activities:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Use Platform for illegal purposes",
          "Violate any laws or regulations",
          "Engage in fraud or deception",
          "Money laundering or financing illegal activities",
          "Tax evasion or non-reporting of income"
        ]
      },
      {
        "t": "p",
        "text": "<b>Abuse & Harassment:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Harass, threaten, or abuse other users",
          "Create hostile environment",
          "Discriminate based on protected characteristics",
          "Defame or slander others",
          "Engage in cyberbullying"
        ]
      },
      {
        "t": "p",
        "text": "<b>Platform Manipulation:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Disrupt or damage Platform",
          "Reverse engineer or hack the Platform",
          "Use bots, scripts, or automation (except API)",
          "Perform DoS or DDoS attacks",
          "Bypass security features",
          "Manipulate AI decision-making",
          "Create fake reviews or ratings"
        ]
      },
      {
        "t": "p",
        "text": "<b>Unauthorized Activities:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Create multiple accounts to game systems",
          "Resell Algorithec service to others",
          "Represent yourself as Algorithec staff",
          "Access others' accounts without permission",
          "Scrape or collect data without permission",
          "Phishing or social engineering"
        ]
      },
      {
        "t": "p",
        "text": "<b>Intellectual Property Violations:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Infringe copyrights or trademarks",
          "Use protected content without permission",
          "Plagiarize or claim others' work",
          "Distribute pirated content",
          "Violate patent rights"
        ]
      },
      {
        "t": "p",
        "text": "<b>Spam & Commercial Use:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Send spam or unsolicited messages",
          "Use for commercial purposes without permission",
          "Advertise products/services without authorization",
          "Network marketing or MLM activities",
          "Bulk purchasing for resale"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "5. TRANSACTIONS & PAYMENTS"
      },
      {
        "t": "h",
        "level": 3,
        "text": "5.1 How Transactions Work"
      },
      {
        "t": "p",
        "text": "<b>Transaction Process:</b>"
      },
      {
        "t": "ul",
        "items": [
          "You provide natural language request",
          "AI analyzes your intent and preferences",
          "Algorithec evaluates options across platforms",
          "Best option selected based on AI ranking",
          "You confirm and authorize transaction",
          "Payment processed through selected method",
          "Order placed with ONDC/partner platform",
          "You receive confirmations and tracking"
        ]
      },
      {
        "t": "p",
        "text": "<b>You Authorize:</b>"
      },
      {
        "t": "ul",
        "items": [
          "AI decision-making based on your instructions",
          "Payment of the decided amount",
          "Collection of transaction data",
          "Automatic completion of transaction"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "5.2 Payment Methods"
      },
      {
        "t": "p",
        "text": "<b>Accepted Methods:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Credit/debit cards (VISA, Mastercard, RuPay)",
          "Net banking",
          "UPI (Google Pay, PhonePe, PayTM, etc.)",
          "Digital wallets",
          "Bank transfers",
          "ONDC native payment methods"
        ]
      },
      {
        "t": "p",
        "text": "<b>Payment Processing:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Third-party payment gateways process payments",
          "SSL encryption for secure transactions",
          "PCI DSS compliant payment handling",
          "Automatic retries for failed payments (max 3 attempts)",
          "Confirmation sent for all transactions"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "5.3 Pricing & Fees"
      },
      {
        "t": "p",
        "text": "<b>Algorithec is Free For:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Finding and recommending options",
          "AI decision-making service",
          "Comparing across platforms"
        ]
      },
      {
        "t": "p",
        "text": "<b>You Pay For:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Actual products/services ordered",
          "Delivery/service charges set by ONDC/partners",
          "Taxes and applicable levies",
          "Partner cancellation fees (if applicable)"
        ]
      },
      {
        "t": "p",
        "text": "<b>We May Earn:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Transaction margins from ONDC (3-6%)",
          "Affiliate/referral commissions from partners (1-4%)",
          "These are included in final prices",
          "Transparent about our revenue model"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "5.4 Refunds & Cancellations"
      },
      {
        "t": "p",
        "text": "<b>ONDC/Partner Policies Apply:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Refund policies of actual seller apply",
          "Algorithec acts as agent for you",
          "Algorithec not responsible for seller policies",
          "Cancellations follow partner platform rules",
          "Refunds processed by ONDC/partners (3-5 business days)"
        ]
      },
      {
        "t": "p",
        "text": "<b>How to Request Refund:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Contact seller/ONDC first",
          "If not resolved, contact us at support@algorithec.ai",
          "Provide order ID and reason",
          "We will escalate to ONDC/partner",
          "Typically resolved within 7-10 business days"
        ]
      },
      {
        "t": "p",
        "text": "<b>Non-Refundable Situations:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Services delivered and used",
          "Digital products accessed",
          "Custom/personalized items",
          "Time-limited offers used",
          "Against seller's policy"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "5.5 Price Accuracy"
      },
      {
        "t": "p",
        "text": "<b>We Strive For Accuracy But:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Partner prices change in real-time",
          "Price may vary between browsing and purchase",
          "Algorithec not responsible for partner price changes",
          "If significant difference (>5%), right to cancel",
          "Notification will be sent before final purchase"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "6. INTELLECTUAL PROPERTY RIGHTS"
      },
      {
        "t": "h",
        "level": 3,
        "text": "6.1 Algorithec's Intellectual Property"
      },
      {
        "t": "p",
        "text": "<b>We Own:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Platform design, layout, features",
          "Source code and algorithms",
          "Content (text, images, logos)",
          "Database and structure",
          "Business processes",
          "AI/ML models and training",
          "Trademarks: \"Algorithec,\" logo, branding",
          "Patents on decision engine technology",
          "Trade secrets and confidential information"
        ]
      },
      {
        "t": "p",
        "text": "<b>Your Rights:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Limited license to use Platform for personal use",
          "Non-exclusive, non-transferable license",
          "Cannot modify or create derivative works",
          "Cannot reproduce or distribute",
          "Must comply with these Terms"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "6.2 Your Content"
      },
      {
        "t": "p",
        "text": "<b>If You Create Content:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Reviews, ratings, feedback",
          "Photos and videos",
          "Comments and messages",
          "User-generated content"
        ]
      },
      {
        "t": "p",
        "text": "<b>You Grant Algorithec:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Worldwide, royalty-free license",
          "Right to use, reproduce, adapt",
          "Right to publicly display",
          "Right to market/promote",
          "Right to create derivative works",
          "Right to sublicense to partners",
          "Perpetual license (survives deletion)"
        ]
      },
      {
        "t": "p",
        "text": "<b>You Represent:</b>"
      },
      {
        "t": "ul",
        "items": [
          "You own the content",
          "You have right to grant license",
          "Content doesn't infringe others' rights",
          "Content is not defamatory or unlawful"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "6.3 Third-Party Content"
      },
      {
        "t": "p",
        "text": "<b>Third-Party Content Includes:</b>"
      },
      {
        "t": "ul",
        "items": [
          "ONDC seller product information",
          "Partner platform content",
          "Advertising and promotional materials",
          "Third-party logos and trademarks"
        ]
      },
      {
        "t": "p",
        "text": "<b>Usage Rights:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Used for informational purposes",
          "Licensed from third parties",
          "May require attribution",
          "Subject to third-party terms",
          "Not our responsibility"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "7. WARRANTIES & DISCLAIMERS"
      },
      {
        "t": "h",
        "level": 3,
        "text": "7.1 Platform \"AS IS\""
      },
      {
        "t": "p",
        "text": "<b>Algorithec Provided \"AS IS\":</b>"
      },
      {
        "t": "ul",
        "items": [
          "Without warranties or conditions",
          "Without guarantee of accuracy",
          "Without guarantee of uninterrupted service",
          "Without guarantee of error-free operation"
        ]
      },
      {
        "t": "p",
        "text": "<b>We Do Not Warrant:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Availability 24/7 (subject to maintenance)",
          "Error-free operation",
          "Accuracy of AI recommendations",
          "Quality of ONDC/partner services",
          "Timeliness of deliveries",
          "Security against all breaches",
          "Fitness for particular purpose"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "7.2 AI Disclaimer"
      },
      {
        "t": "p",
        "text": "<b>AI Decisions Are Not Guaranteed:</b>"
      },
      {
        "t": "ul",
        "items": [
          "AI rankings based on available data",
          "Prices/availability change constantly",
          "AI may miss better options",
          "User preferences may not be fully captured",
          "Real-time data not always available",
          "External factors unpredictable"
        ]
      },
      {
        "t": "p",
        "text": "<b>You Must Verify:</b>"
      },
      {
        "t": "ul",
        "items": [
          "AI recommendations before accepting",
          "Prices and availability after selection",
          "Terms and conditions of actual seller",
          "Cancel before payment if prices changed",
          "Take responsibility for final decision"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "7.3 No Endorsement"
      },
      {
        "t": "p",
        "text": "<b>We Do Not Endorse:</b>"
      },
      {
        "t": "ul",
        "items": [
          "ONDC sellers or service quality",
          "Partner platforms or their services",
          "Products or service providers",
          "Recommendations of other users",
          "Third-party websites or content",
          "Accuracy of pricing information"
        ]
      },
      {
        "t": "p",
        "text": "<b>You Assume Risk:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Quality of purchased items",
          "Reliability of service providers",
          "Delivery timeliness",
          "Seller disputes and scams",
          "Product defects or damages",
          "Service delivery issues"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "7.4 Third-Party Services"
      },
      {
        "t": "p",
        "text": "<b>Regarding ONDC & Partners:</b>"
      },
      {
        "t": "ul",
        "items": [
          "They are independent third parties",
          "Their terms and conditions apply",
          "Algorithec acts as agent only",
          "Their policies govern transactions",
          "We are not their representative",
          "No authority to bind them",
          "Disputes with them, not us"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "8. LIMITATION OF LIABILITY"
      },
      {
        "t": "h",
        "level": 3,
        "text": "8.1 Liability Cap"
      },
      {
        "t": "p",
        "text": "<b>MAXIMUM LIABILITY:</b>"
      },
      {
        "t": "p",
        "text": "Algorithec's total liability for all claims shall not exceed the GREATER of:"
      },
      {
        "t": "ul",
        "items": [
          "₹1,000 (₹One Thousand)",
          "Amount you paid us in past 12 months"
        ]
      },
      {
        "t": "p",
        "text": "This applies to ALL claims combined (negligence, breach, tort, etc.)."
      },
      {
        "t": "h",
        "level": 3,
        "text": "8.2 Excluded Damages"
      },
      {
        "t": "p",
        "text": "<b>We Are NOT Liable For:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Lost profits or business",
          "Lost data or information",
          "Lost revenue or savings",
          "Lost goodwill or reputation",
          "Consequential damages",
          "Indirect damages",
          "Incidental damages",
          "Special damages",
          "Punitive damages",
          "Damages for interruption of service",
          "Damages from AI errors"
        ]
      },
      {
        "t": "p",
        "text": "<b>Even if:</b>"
      },
      {
        "t": "ul",
        "items": [
          "We were aware of possibility",
          "We were advised of damages",
          "Damages seem foreseeable"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "8.3 Carve-Outs to Limitation"
      },
      {
        "t": "p",
        "text": "<b>We Are Still Liable For:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Death or personal injury from negligence",
          "Fraud or willful misconduct",
          "As required by mandatory law",
          "Consumer protection violations",
          "Violations of fundamental rights"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "9. INDEMNIFICATION"
      },
      {
        "t": "p",
        "text": "You agree to indemnify and hold harmless Algorithec from:"
      },
      {
        "t": "ul",
        "items": [
          "Claims arising from your use of Platform",
          "Your violation of these Terms",
          "Your violation of laws",
          "Your infringement of IP rights",
          "Your harm to third parties",
          "Your breach of others' rights",
          "Claims related to your content",
          "Disputes with other users",
          "Disputes with ONDC/partners"
        ]
      },
      {
        "t": "p",
        "text": "Including:"
      },
      {
        "t": "ul",
        "items": [
          "Legal fees and costs",
          "Settlement amounts",
          "Damages awarded",
          "Investigation costs",
          "Administrative costs"
        ]
      },
      {
        "t": "p",
        "text": "<b>You Will Defend Us:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Against third-party claims",
          "At your expense",
          "With counsel of our choice",
          "We cooperate and assist"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "10. TERMINATION & SUSPENSION"
      },
      {
        "t": "h",
        "level": 3,
        "text": "10.1 Our Right to Terminate"
      },
      {
        "t": "p",
        "text": "We may terminate or suspend your account:"
      },
      {
        "t": "ul",
        "items": [
          "Immediately, with or without cause",
          "Without notice in cases of abuse",
          "For violation of Terms",
          "For illegal activity",
          "For non-compliance with laws",
          "For operational reasons",
          "For security concerns",
          "Due to fraud",
          "Technical reasons"
        ]
      },
      {
        "t": "p",
        "text": "<b>Effect of Termination:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Immediate access loss",
          "No future transactions",
          "Retention of data per Privacy Policy",
          "No refunds for unused credits",
          "Potential legal action"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "10.2 Your Right to Terminate"
      },
      {
        "t": "p",
        "text": "You may terminate account anytime:"
      },
      {
        "t": "ul",
        "items": [
          "In app settings Account Delete Account",
          "Or email: support@algorithec.ai",
          "Effective immediately upon request",
          "Permanent deletion of account",
          "Data retained per Privacy Policy"
        ]
      },
      {
        "t": "p",
        "text": "<b>Upon Termination:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Access will be revoked",
          "Pending transactions completed (if possible)",
          "Refund of unused credits (if applicable)",
          "Data deletion per Privacy Policy",
          "Account cannot be recovered"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "10.3 Effect of Termination"
      },
      {
        "t": "p",
        "text": "<b>We Will:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Stop providing service",
          "Revoke login credentials",
          "Retain data per Privacy Policy",
          "Complete pending transactions if possible",
          "Process refunds where due"
        ]
      },
      {
        "t": "p",
        "text": "<b>Your Obligations Continue:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Payment for services received",
          "Indemnification obligations",
          "IP infringement liability",
          "Confidentiality obligations",
          "Legal compliance"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "11. DISPUTE RESOLUTION"
      },
      {
        "t": "h",
        "level": 3,
        "text": "11.1 Informal Resolution"
      },
      {
        "t": "p",
        "text": "<b>First Step - Good Faith Discussion:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Contact: support@algorithec.ai",
          "Describe dispute in detail",
          "Include order IDs, dates, amounts",
          "Proposed resolution",
          "10 business days for response",
          "Attempt good faith negotiation"
        ]
      },
      {
        "t": "p",
        "text": "<b>Escalation:</b>"
      },
      {
        "t": "ul",
        "items": [
          "If not resolved, email: grievance@algorithec.ai",
          "Formal grievance filed",
          "Assigned to grievance officer",
          "30-day investigation",
          "Written response within 45 days"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "11.2 Mediation"
      },
      {
        "t": "p",
        "text": "<b>If Still Unresolved:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Attempt mediation (optional)",
          "Both parties agree to mediator",
          "Neutral third party",
          "Not binding unless agreed",
          "Costs split equally",
          "Confidential process"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "11.3 Arbitration"
      },
      {
        "t": "p",
        "text": "<b>Binding Arbitration:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Single arbitrator",
          "Under Indian Arbitration & Conciliation Act, 1996",
          "Seat of arbitration: Bangalore, Karnataka",
          "Language: English",
          "Rules: ICC Arbitration Rules (modified for India)",
          "Arbitrator's decision is binding",
          "Limited appeal rights"
        ]
      },
      {
        "t": "p",
        "text": "<b>Arbitration Details:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Costs: Each party bears own costs, arbitrator fees split",
          "Timeline: Award within 6 months",
          "Confidential proceedings",
          "Limited discovery",
          "Cannot appeal decision (except extreme circumstances)"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "11.4 Litigation"
      },
      {
        "t": "p",
        "text": "<b>If Arbitration Not Chosen:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Jurisdiction: Courts of Bangalore, Karnataka",
          "Governing Law: Laws of India",
          "Venue: Bangalore exclusively",
          "Cannot sue elsewhere",
          "Subject to court procedures",
          "Appeals available"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "11.5 Class Actions Waiver"
      },
      {
        "t": "p",
        "text": "<b>You Agree NOT To:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Bring class action suits",
          "Pursue claims on collective basis",
          "Combine claims with other users",
          "Seek representative damages",
          "Join in class or group proceedings"
        ]
      },
      {
        "t": "p",
        "text": "<b>Each claim must be:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Individual arbitration or litigation",
          "Separate from other claims",
          "Not combined with others"
        ]
      },
      {
        "t": "p",
        "text": "<b>Exceptions:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Regulatory authorities' claims",
          "Claims within Indian consumer law"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "12. GOVERNING LAW & JURISDICTION"
      },
      {
        "t": "h",
        "level": 3,
        "text": "12.1 Governing Law"
      },
      {
        "t": "p",
        "text": "<b>These Terms Governed By:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Laws of India",
          "Without regard to conflict of laws",
          "Excluding UN Convention on Contracts",
          "Indian courts' interpretation"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "12.2 Jurisdiction"
      },
      {
        "t": "p",
        "text": "<b>Exclusive Jurisdiction:</b>"
      },
      {
        "t": "ul",
        "items": [
          "District courts of Bangalore, Karnataka",
          "Or arbitration in Bangalore",
          "Cannot file suit elsewhere",
          "Subject to Indian procedure"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "12.3 Legal Compliance"
      },
      {
        "t": "p",
        "text": "You agree to comply with:"
      },
      {
        "t": "ul",
        "items": [
          "Indian Constitution",
          "Central and state laws",
          "Local ordinances and regulations",
          "Regulatory requirements",
          "Judicial orders and injunctions"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "13. CONTENT & USER CONDUCT POLICIES"
      },
      {
        "t": "h",
        "level": 3,
        "text": "13.1 Review & Feedback Policy"
      },
      {
        "t": "p",
        "text": "<b>Your Reviews Must Be:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Factual and honest",
          "Based on your actual experience",
          "Respectful and non-abusive",
          "Not commercial spam",
          "Not competitive attacks",
          "Not plagiarized",
          "Not defamatory or false",
          "Within community guidelines"
        ]
      },
      {
        "t": "p",
        "text": "<b>We Will Remove:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Fake reviews",
          "Paid/incentivized reviews",
          "Abusive language",
          "Defamatory content",
          "Commercial spam",
          "Spam or duplicate reviews",
          "Off-topic content",
          "Vendor manipulation attempts"
        ]
      },
      {
        "t": "p",
        "text": "<b>Your Rights:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Appeal removal of review",
          "Respond to others' comments",
          "Delete your own reviews"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "13.2 Community Guidelines"
      },
      {
        "t": "p",
        "text": "<b>Be Respectful:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Treat others with respect",
          "No hate speech or discrimination",
          "No harassment or threats",
          "No adult content",
          "No violence or gore",
          "No illegal content"
        ]
      },
      {
        "t": "p",
        "text": "<b>Be Honest:</b>"
      },
      {
        "t": "ul",
        "items": [
          "True experiences only",
          "No false claims",
          "Disclose conflicts of interest",
          "No scams or fraud",
          "Factual information"
        ]
      },
      {
        "t": "p",
        "text": "<b>Be Helpful:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Constructive feedback",
          "Detailed and relevant",
          "Help others make decisions",
          "Follow-up and resolution"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "13.3 Moderation & Enforcement"
      },
      {
        "t": "p",
        "text": "<b>We Will:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Monitor content",
          "Remove violations",
          "Warn first-time offenders (usually)",
          "Suspend repeat violators",
          "Terminate chronic abusers",
          "Report illegal content to authorities",
          "Cooperate with law enforcement"
        ]
      },
      {
        "t": "p",
        "text": "<b>We May Disclose:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Information to law enforcement",
          "Identify abusive users",
          "Preserve evidence of violations",
          "Protect Platform and users"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "14. LIMITATION OF SERVICE"
      },
      {
        "t": "h",
        "level": 3,
        "text": "14.1 Service Interruptions"
      },
      {
        "t": "p",
        "text": "<b>We Are Not Liable For:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Planned maintenance downtime",
          "Unplanned technical issues",
          "Third-party service failures",
          "Internet outages",
          "Cyber attacks (outside our control)",
          "Natural disasters",
          "Government actions",
          "Force majeure events"
        ]
      },
      {
        "t": "p",
        "text": "<b>We Will:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Minimize interruptions",
          "Schedule maintenance off-peak",
          "Notify of planned downtime",
          "Attempt quick restoration",
          "Communicate status updates"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "14.2 Availability Limitations"
      },
      {
        "t": "p",
        "text": "<b>Algorithec May Not Be Available:</b>"
      },
      {
        "t": "ul",
        "items": [
          "In all geographic areas",
          "For all product categories",
          "At all times (maintenance)",
          "During partner platform outages",
          "During technical issues",
          "During security incidents"
        ]
      },
      {
        "t": "p",
        "text": "<b>Check Availability:</b>"
      },
      {
        "t": "ul",
        "items": [
          "For your location",
          "For your category",
          "For your timing",
          "Before attempting transaction"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "15. CHANGES TO TERMS & SERVICE"
      },
      {
        "t": "h",
        "level": 3,
        "text": "15.1 Right to Modify"
      },
      {
        "t": "p",
        "text": "We may modify these Terms:"
      },
      {
        "t": "ul",
        "items": [
          "At any time, in our sole discretion",
          "To comply with laws",
          "To improve service",
          "To add/remove features",
          "To change policies"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "15.2 Notice & Effective Date"
      },
      {
        "t": "p",
        "text": "<b>Changes Effective:</b>"
      },
      {
        "t": "ul",
        "items": [
          "30 days after notification (major changes)",
          "Immediately for urgency",
          "Immediately for legality",
          "Notification via email or in-app"
        ]
      },
      {
        "t": "p",
        "text": "<b>Major Changes Include:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Fees or billing changes",
          "Liability limitations",
          "Termination changes",
          "Dispute resolution changes"
        ]
      },
      {
        "t": "p",
        "text": "<b>Minor Changes:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Formatting and clarification",
          "Process improvements",
          "Grammatical corrections",
          "Effective immediately"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "15.3 Your Options"
      },
      {
        "t": "p",
        "text": "<b>If You Disagree:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Don't use Platform",
          "Request account deletion",
          "Stop new transactions",
          "Current transactions unaffected",
          "No refund for disagreement"
        ]
      },
      {
        "t": "p",
        "text": "<b>Continued Use = Acceptance</b>"
      },
      {
        "t": "ul",
        "items": [
          "Using Platform after 30 days = acceptance",
          "You can't avoid changes by ignoring notices"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "16. CONTACT INFORMATION"
      },
      {
        "t": "h",
        "level": 3,
        "text": "16.1 Support & Complaints"
      },
      {
        "t": "p",
        "text": "<b>Customer Support:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Email: support@algorithec.ai",
          "Phone: +91 7396144250",
          "Chat: In-app support",
          "Hours: 10 AM - 6 PM IST, Monday-Friday",
          "Response: Within 24 business hours"
        ]
      },
      {
        "t": "p",
        "text": "<b>Grievance Officer:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Email: grievance@algorithec.ai",
          "Phone: +91 7396144250",
          "Address: See below",
          "30-day response window"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "16.2 Legal Notices"
      },
      {
        "t": "p",
        "text": "<b>Deliver To:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Email: legal@algorithec.ai",
          "Address below"
        ]
      },
      {
        "t": "p",
        "text": "<b>ALGORITHEC PRIVATE LIMITED</b> Legal Department Unit 101, Oxford Towers, 139/88, Hal Old Airport RD, H.A.L II Stage, Bangalore North, Bangalore - 560008, Karnataka, India"
      },
      {
        "t": "h",
        "level": 2,
        "text": "17. REGULATORY & STATUTORY INFORMATION"
      },
      {
        "t": "h",
        "level": 3,
        "text": "17.1 Regulatory Compliance"
      },
      {
        "t": "p",
        "text": "<b>We Comply With:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Indian Companies Act, 1956",
          "Information Technology Act, 2000",
          "Consumer Protection Act, 2019",
          "Digital Personal Data Protection Act, 2023",
          "Telecom Commercial Communications Regulation",
          "RBI Guidelines on Digital Payment Systems",
          "ONDC Regulations and Guidelines",
          "Tax Laws (GST, Income Tax, etc.)"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "17.2 Statutory Acknowledgments"
      },
      {
        "t": "p",
        "text": "<b>You Acknowledge:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Consumer Protection Act rights apply",
          "Not limited to these Terms",
          "Additional statutory rights exist",
          "Mandatory laws cannot be waived",
          "Some limitations may not apply"
        ]
      },
      {
        "t": "p",
        "text": "<b>Consumer Redressal:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Available under Consumer Protection Act, 2019",
          "Applicable despite dispute resolution clause",
          "District Consumer Commissions have jurisdiction",
          "National Commission for large disputes",
          "No arbitration mandatory for consumer disputes"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "18. MISCELLANEOUS"
      },
      {
        "t": "h",
        "level": 3,
        "text": "18.1 Entire Agreement"
      },
      {
        "t": "p",
        "text": "<b>This Agreement Contains:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Entire Terms and conditions",
          "Supersedes prior understandings",
          "Combined with Privacy Policy",
          "Integrated agreement",
          "No oral modifications valid"
        ]
      },
      {
        "t": "p",
        "text": "<b>Written Modifications Only:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Must be signed by both parties",
          "Email acknowledgment acceptable",
          "Oral changes are not valid",
          "Platform notices don't change written Terms"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "18.2 Severability"
      },
      {
        "t": "p",
        "text": "<b>If Any Provision Is Invalid:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Remaining provisions stand",
          "Invalid provision severed",
          "Terms enforced to maximum extent",
          "Least restrictive interpretation applied"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "18.3 Waiver"
      },
      {
        "t": "p",
        "text": "<b>Non-Enforcement Not Waiver:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Failing to enforce right ≠ waiving right",
          "One waiver ≠ all waivers",
          "Must be in writing",
          "Time-limited unless stated",
          "Can be revoked anytime"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "18.4 Assignment"
      },
      {
        "t": "p",
        "text": "<b>We May Assign:</b>"
      },
      {
        "t": "ul",
        "items": [
          "These Terms",
          "Your account",
          "All our rights",
          "To successor company",
          "Upon notice to you"
        ]
      },
      {
        "t": "p",
        "text": "<b>You May Not Assign:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Your account or rights",
          "Without our written consent",
          "Any assignment void",
          "Attempt to assign is breach"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "18.5 Survival"
      },
      {
        "t": "p",
        "text": "<b>Provisions That Survive Termination:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Intellectual property rights",
          "Indemnification",
          "Limitation of liability",
          "Dispute resolution",
          "Confidentiality obligations",
          "Payment obligations",
          "Legal compliance obligations"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "19. ACKNOWLEDGMENT & AGREEMENT"
      },
      {
        "t": "p",
        "text": "<b>By using Algorithec, you:</b>"
      },
      {
        "t": "p",
        "text": "Have read and understood these Terms completely Agree to be legally bound by these Terms Consent to our data practices (Privacy Policy) Confirm you are 18+ years old Have authority to enter into this agreement Are not prohibited from using the Platform Will comply with all laws and Terms Understand risks and limitations Accept \"AS IS\" Platform Agree to arbitration (if applicable)"
      },
      {
        "t": "p",
        "text": "<b>© 2026 ALGORITHEC PRIVATE LIMITED. All Rights Reserved.</b>"
      },
      {
        "t": "p",
        "text": "<b>Last Updated: May 28, 2026</b> <b>Next Review: May 28, 2027</b>"
      },
      {
        "t": "h",
        "level": 2,
        "text": "CONTACT US"
      },
      {
        "t": "p",
        "text": "For questions about these Terms:"
      },
      {
        "t": "p",
        "text": "<b>Email:</b> legal@algorithec.ai <b>Phone:</b> +91 7396144250 <b>Website:</b> www.algorithec.ai"
      },
      {
        "t": "p",
        "text": "<b>ALGORITHEC PRIVATE LIMITED</b> Unit 101, Oxford Towers, 139/88, Hal Old Airport RD, H.A.L II Stage, Bangalore North, Bangalore - 560008, Karnataka, India"
      },
      {
        "t": "p",
        "text": "<b>END OF TERMS OF SERVICE</b>"
      }
    ]
  },
  {
    "slug": "acceptable-use",
    "title": "Acceptable Use and AI Policy",
    "description": "What you can and cannot do on Flouna, and how the decision engine works.",
    "blocks": [
      {
        "t": "h",
        "level": 3,
        "text": "1.1 PURPOSE"
      },
      {
        "t": "p",
        "text": "This Acceptable Use Policy (\"Policy\") sets forth the standards of conduct that users must follow when using Algorithec's Platform. This Policy applies to all users, including free users, paying customers, and partners."
      },
      {
        "t": "h",
        "level": 2,
        "text": "1.2 PROHIBITED USES"
      },
      {
        "t": "h",
        "level": 3,
        "text": "A. Illegal Activities"
      },
      {
        "t": "p",
        "text": "Users must <b>NOT</b>:"
      },
      {
        "t": "ul",
        "items": [
          "Violate any federal, state, local, or international laws",
          "Engage in fraud, deception, or forgery",
          "Facilitate money laundering or terrorist financing",
          "Evade taxes or misrepresent income",
          "Engage in cybercrime or hacking",
          "Violate consumer protection laws",
          "Facilitate unlicensed financial services",
          "Engage in any form of trafficking",
          "Facilitate unauthorized distribution of controlled substances"
        ]
      },
      {
        "t": "p",
        "text": "<b>Consequences:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Immediate account termination",
          "Data preservation for law enforcement",
          "Legal action and criminal referral",
          "Cooperation with authorities"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "B. Harassment & Abuse"
      },
      {
        "t": "p",
        "text": "Users must <b>NOT</b>:"
      },
      {
        "t": "ul",
        "items": [
          "Harass, stalk, or threaten other users",
          "Engage in cyberbullying or targeted harassment",
          "Create hostile environment for protected classes",
          "Discriminate based on race, color, religion, caste, sex, gender identity, sexual orientation, national origin, age, or disability",
          "Defame, slander, or libel others",
          "Reveal private information without consent (doxxing)",
          "Engage in sexual harassment",
          "Make death threats or threats of violence"
        ]
      },
      {
        "t": "p",
        "text": "<b>Consequences:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Warning for first offense (usually)",
          "Account suspension for escalation",
          "Permanent account termination",
          "Potential legal action",
          "Law enforcement notification (if warranted)"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "C. Platform Manipulation & Abuse"
      },
      {
        "t": "p",
        "text": "Users must <b>NOT</b>:"
      },
      {
        "t": "ul",
        "items": [
          "Attempt to hack or gain unauthorized access",
          "Reverse engineer or decompile code",
          "Use bots, scrapers, or automated tools",
          "Perform DDoS or DoS attacks",
          "Create multiple accounts to bypass restrictions",
          "Manipulate AI algorithm through fake reviews",
          "Exploit security vulnerabilities",
          "Access others' accounts without permission",
          "Use proxy servers to bypass restrictions",
          "Interfere with Platform operations"
        ]
      },
      {
        "t": "p",
        "text": "<b>Consequences:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Immediate account termination",
          "IP ban",
          "Legal action for damages",
          "Cooperation with law enforcement"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "D. Spam & Unwanted Communications"
      },
      {
        "t": "p",
        "text": "Users must <b>NOT</b>:"
      },
      {
        "t": "ul",
        "items": [
          "Send unsolicited commercial messages",
          "Send phishing or malware",
          "Engage in network marketing or pyramid schemes",
          "Send chain letters or mass emails",
          "Advertise unauthorized products/services",
          "Send misleading or deceptive messages",
          "Flood Platform with repetitive content",
          "Engage in email spoofing"
        ]
      },
      {
        "t": "p",
        "text": "<b>Consequences:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Content removal",
          "Account suspension",
          "Permanent termination",
          "IP ban"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "E. Intellectual Property Violations"
      },
      {
        "t": "p",
        "text": "Users must <b>NOT</b>:"
      },
      {
        "t": "ul",
        "items": [
          "Infringe copyrights (sharing pirated content, unauthorized copying)",
          "Violate trademarks or service marks",
          "Plagiarize others' content",
          "Claim ownership of others' work",
          "Violate patents",
          "Violate trade secrets",
          "Distribute copyright-protected material",
          "Create derivative works without permission"
        ]
      },
      {
        "t": "p",
        "text": "<b>Consequences:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Content removal",
          "Account suspension",
          "DMCA takedown compliance",
          "Legal action for damages",
          "Permanent account termination"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "F. Fraudulent Activity"
      },
      {
        "t": "p",
        "text": "Users must <b>NOT</b>:"
      },
      {
        "t": "ul",
        "items": [
          "Make false claims about products/services",
          "Misrepresent themselves or affiliations",
          "Provide false information during registration",
          "Engage in chargebacks for legitimate purchases",
          "Return stolen goods as legitimate returns",
          "Create fake reviews or manipulate ratings",
          "Engage in payment fraud",
          "Use stolen payment methods",
          "Impersonate Algorithec staff",
          "Engage in advance-fee fraud"
        ]
      },
      {
        "t": "p",
        "text": "<b>Consequences:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Immediate account termination",
          "Legal action",
          "Criminal referral to authorities",
          "Cooperation with law enforcement",
          "Blacklist to prevent re-registration"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "G. Adult & Explicit Content"
      },
      {
        "t": "p",
        "text": "Users must <b>NOT</b>:"
      },
      {
        "t": "ul",
        "items": [
          "Upload or share sexually explicit content",
          "Share child sexual abuse material (illegal, serious consequences)",
          "Share content involving minors in adult situations",
          "Share non-consensual intimate images (\"revenge porn\")",
          "Engage in sex trafficking or exploitation",
          "Solicit sexual services",
          "Create adult content involving real people without consent"
        ]
      },
      {
        "t": "p",
        "text": "<b>Consequences:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Immediate account termination",
          "Content removal and preservation",
          "Criminal referral to law enforcement",
          "Blacklist and ban",
          "Law enforcement cooperation"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "H. Violence & Dangerous Content"
      },
      {
        "t": "p",
        "text": "Users must <b>NOT</b>:"
      },
      {
        "t": "ul",
        "items": [
          "Share content depicting graphic violence or gore",
          "Provide instructions for self-harm",
          "Provide instructions for creating weapons",
          "Glorify or encourage violence",
          "Provide instructions for illegal drugs",
          "Share content promoting terrorism",
          "Provide suicide instructions",
          "Encourage dangerous activities"
        ]
      },
      {
        "t": "p",
        "text": "<b>Consequences:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Content removal",
          "Account suspension",
          "Permanent termination",
          "Law enforcement notification (if warranted)",
          "Crisis intervention resources provided"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "1.3 ALGORITHMIC INTEGRITY & AI FAIRNESS"
      },
      {
        "t": "h",
        "level": 3,
        "text": "A. Fair Use of AI System"
      },
      {
        "t": "p",
        "text": "Users must:"
      },
      {
        "t": "ul",
        "items": [
          "Accept AI recommendations in good faith",
          "Not attempt to manipulate AI decisions",
          "Provide accurate preferences and instructions",
          "Not create fake reviews to game AI",
          "Accept that AI decisions are automated",
          "Verify recommendations before accepting",
          "Report AI errors or bias"
        ]
      },
      {
        "t": "p",
        "text": "Users must <b>NOT</b>:"
      },
      {
        "t": "ul",
        "items": [
          "Attempt to reverse engineer AI",
          "Try to consistently reject AI recommendations to game system",
          "Create multiple accounts to manipulate AI training",
          "Provide false information to train AI models",
          "Attempt to create bias in AI through coordinated fake reviews",
          "Use AI for unauthorized bulk transactions",
          "Resell AI decision service to others"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "B. Transparency & Disclaimer Acceptance"
      },
      {
        "t": "p",
        "text": "Users acknowledge:"
      },
      {
        "t": "ul",
        "items": [
          "AI decisions are automated, not human-reviewed",
          "AI bases decisions on available data (may be outdated)",
          "AI may not capture all preferences",
          "Prices and availability change after AI decision",
          "ONDC/partner policies still apply",
          "Final decision remains user's responsibility",
          "AI errors and limitations are possible",
          "User should verify before accepting"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "1.4 COMMERCE PARTNER VIOLATIONS"
      },
      {
        "t": "h",
        "level": 3,
        "text": "A. ONDC Seller Fraud"
      },
      {
        "t": "p",
        "text": "Users must <b>NOT</b>:"
      },
      {
        "t": "ul",
        "items": [
          "Use Algorithec to defraud ONDC sellers",
          "Use fake payment methods for ONDC purchases",
          "Request refunds for items received and used",
          "Claim items not received when they were",
          "Return counterfeit items as originals",
          "Engage in chargeback fraud",
          "Coordinate refund fraud with other users"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "B. Rating & Review Manipulation"
      },
      {
        "t": "p",
        "text": "Users must <b>NOT</b>:"
      },
      {
        "t": "ul",
        "items": [
          "Pay for positive reviews",
          "Accept payment for positive reviews",
          "Vote on reviews based on competitor relationships",
          "Create fake accounts to review",
          "Leave reviews for products not purchased",
          "Leave reviews for false experiences",
          "Coordinate review manipulation",
          "Leave reviews unrelated to product"
        ]
      },
      {
        "t": "p",
        "text": "<b>ONDC & Partner Consequences:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Review removal",
          "Account restrictions on ONDC",
          "Seller/buyer blacklist",
          "Potential legal action by seller"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "1.5 PRIVACY & DATA MISUSE"
      },
      {
        "t": "p",
        "text": "Users must <b>NOT</b>:"
      },
      {
        "t": "ul",
        "items": [
          "Collect other users' personal data",
          "Scrape the Platform",
          "Use data for unauthorized purposes",
          "Share others' personal information",
          "Engage in unauthorized data mining",
          "Violate others' privacy expectations",
          "Access others' accounts"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "1.6 ENFORCEMENT & CONSEQUENCES"
      },
      {
        "t": "h",
        "level": 3,
        "text": "Tiered Approach:"
      },
      {
        "t": "p",
        "text": "<b>Warning (First Offense - Usually):</b>"
      },
      {
        "t": "ul",
        "items": [
          "Violation notice",
          "Description of violation",
          "Opportunity to cure",
          "Policy clarification",
          "Account remains active"
        ]
      },
      {
        "t": "p",
        "text": "<b>Suspension (Second Offense or Severity):</b>"
      },
      {
        "t": "ul",
        "items": [
          "Temporary access loss (7-30 days)",
          "Inability to make purchases",
          "Ability to access data",
          "Right to appeal",
          "Clear timeline for reinstatement",
          "May require corrective action"
        ]
      },
      {
        "t": "p",
        "text": "<b>Permanent Termination (Repeated or Severe):</b>"
      },
      {
        "t": "ul",
        "items": [
          "Immediate account loss",
          "No refunds for unused credits",
          "Blacklist to prevent re-registration",
          "Potential legal action",
          "Data preservation for authorities",
          "No reinstatement option"
        ]
      },
      {
        "t": "p",
        "text": "<b>Immediate Termination (Serious Violations):</b>"
      },
      {
        "t": "ul",
        "items": [
          "Illegal activity",
          "Child exploitation",
          "Terrorism or violence",
          "Extreme harassment",
          "Fraud or repeated fraud",
          "System attacks"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "PART 2: AI DECISION ENGINE SPECIFIC POLICY"
      },
      {
        "t": "h",
        "level": 3,
        "text": "2.1 HOW THE AI WORKS"
      },
      {
        "t": "p",
        "text": "<b>Our AI Decision Engine:</b>"
      },
      {
        "t": "ul",
        "items": [
          "<b>Understands Intent</b> - NLP processes your natural language request",
          "<b>Gathers Data</b> - Searches across ONDC, partner platforms in real-time",
          "<b>Evaluates Options</b> - Scores based on multiple factors:",
          "Price (lowest cost option)",
          "Delivery speed (fastest option)",
          "Reliability (seller/service rating)",
          "Quality signals (user reviews, return rates)",
          "Discounts/offers (current promotions)",
          "Your historical preferences (learning model)",
          "Budget constraints (your specified limits)",
          "Time constraints (your urgency level)"
        ]
      },
      {
        "t": "ul",
        "items": [
          "<b>Ranks Results</b> - Proprietary algorithm weights factors",
          "<b>Applies Discounts</b> - Auto-applies available coupons, cashback",
          "<b>Makes Decision</b> - Presents best option for acceptance",
          "<b>Executes Transaction</b> - Places order once you confirm",
          "<b>Tracks Fulfillment</b> - Updates you on status"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "2.2 AI LIMITATIONS YOU SHOULD KNOW"
      },
      {
        "t": "p",
        "text": "<b>The AI Cannot:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Guarantee lowest possible price (real-time changes)",
          "Predict future price drops (incomplete market data)",
          "Guarantee seller reliability (rating-based estimation)",
          "Know all available options (limited to integrated platforms)",
          "Capture all your preferences (incomplete user input)",
          "Predict quality (based on aggregate reviews)",
          "Guarantee availability (changes constantly)",
          "Account for all delivery options (depends on partner availability)",
          "Know future promotions (based on current data)",
          "Read between the lines (based on stated intent)"
        ]
      },
      {
        "t": "p",
        "text": "<b>External Factors AI Can't Control:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Seller inventory changes",
          "Price changes between decision and purchase",
          "Discount expiration",
          "Platform outages",
          "Delivery delays",
          "Quality issues with seller",
          "Shipping damages",
          "Returns/refund policies",
          "Payment issues",
          "Network problems"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "2.3 AI TRANSPARENCY & EXPLAINABILITY"
      },
      {
        "t": "p",
        "text": "<b>What We Show You:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Top 3 options considered",
          "Why we ranked #1 option first",
          "Key factors in decision",
          "Price comparison",
          "Delivery estimates",
          "Seller ratings",
          "Available discounts"
        ]
      },
      {
        "t": "p",
        "text": "<b>What We Don't Show:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Exact algorithm weights",
          "Training data composition",
          "Complete decision tree",
          "Proprietary ranking formula",
          "Full option evaluation (too many to display)"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "2.4 AI TRAINING & IMPROVEMENTS"
      },
      {
        "t": "p",
        "text": "<b>How We Improve AI:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Analyze decision patterns",
          "Study user feedback",
          "Learn from corrections",
          "Identify errors/gaps",
          "Update models regularly",
          "Test new algorithms",
          "A/B test improvements",
          "Measure accuracy metrics"
        ]
      },
      {
        "t": "p",
        "text": "<b>Your Data & AI Training:</b>"
      },
      {
        "t": "ul",
        "items": [
          "We use anonymized data to improve AI",
          "You can opt-out of AI training (Settings Privacy)",
          "We don't identify individuals in training",
          "Individual decisions not stored as examples",
          "Aggregate patterns used for learning",
          "Zero-party data (stated preferences) used",
          "Behavioral signals analyzed"
        ]
      },
      {
        "t": "p",
        "text": "<b>AI Fairness:</b>"
      },
      {
        "t": "ul",
        "items": [
          "We monitor for bias",
          "Test for discrimination",
          "Regular audits conducted",
          "Address disparities found",
          "Transparent about limitations",
          "Accept feedback on bias",
          "Continuously improve fairness"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "2.5 AI DECISION APPEALS"
      },
      {
        "t": "p",
        "text": "<b>If You Disagree With AI Decision:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Select \"Why this option?\"",
          "Provide feedback on factors",
          "Specify what you wanted instead",
          "Submit improvement suggestion",
          "Our team reviews feedback",
          "We retrain models based on feedback"
        ]
      },
      {
        "t": "p",
        "text": "<b>Example Appeals:</b>"
      },
      {
        "t": "ul",
        "items": [
          "\"I wanted fastest delivery, not cheapest\"",
          "\"This seller has bad reviews, should rank lower\"",
          "\"You missed option X from my preferred seller\"",
          "\"Price comparison seems wrong\"",
          "\"This option is no longer available\""
        ]
      },
      {
        "t": "p",
        "text": "<b>Resolution:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Review within 5 business days",
          "Corrective action if needed",
          "Model improvement if applicable",
          "Response provided to user",
          "Appeal tracking for AI improvement"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "2.6 AUTOMATED DECISIONS & YOUR RIGHTS"
      },
      {
        "t": "p",
        "text": "<b>Your Rights Regarding Automated Decisions:</b>"
      },
      {
        "t": "p",
        "text": "Under Indian law, you have the right to:"
      },
      {
        "t": "ul",
        "items": [
          "Know a decision was automated",
          "Request human review of automated decision",
          "Understand factors used in decision",
          "Contest the decision",
          "Appeal to human decision-maker"
        ]
      },
      {
        "t": "p",
        "text": "<b>Our Commitment:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Be transparent that AI made decision",
          "Explain factors considered",
          "Allow human override",
          "Accept your manual overrides",
          "Not force automated decisions",
          "Provide appeals process",
          "Maintain human support option"
        ]
      },
      {
        "t": "p",
        "text": "<b>You Can Always:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Ask for human assistant",
          "Manually select option from list",
          "Reject AI recommendation",
          "Contact support for manual help",
          "Request human decision-maker review"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "2.7 AI ERROR HANDLING"
      },
      {
        "t": "p",
        "text": "<b>If AI Makes Error:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Report immediately via support",
          "Provide error description",
          "Include order/transaction ID",
          "We investigate within 24 hours",
          "Escalate to AI team",
          "Provide resolution/correction",
          "Adjust recommendation if needed",
          "Improve model to prevent recurrence"
        ]
      },
      {
        "t": "p",
        "text": "<b>Common Errors:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Price comparison inaccuracy",
          "Seller rating mismatch",
          "Availability not updated",
          "Discount already expired",
          "Wrong category selection",
          "Delivery estimate wrong",
          "Item not as described by AI"
        ]
      },
      {
        "t": "p",
        "text": "<b>Our Response:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Acknowledge error",
          "Correct if possible",
          "Offer alternative",
          "Provide compensation if appropriate",
          "Prevent similar errors",
          "Improve models"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "2.8 AI BIAS & FAIRNESS"
      },
      {
        "t": "p",
        "text": "<b>We Commit To:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Regular bias audits",
          "Testing for discrimination",
          "Monitoring for disparate impact",
          "Addressing identified biases",
          "Transparent about limitations",
          "Accepting feedback on bias",
          "Continuous fairness improvement"
        ]
      },
      {
        "t": "p",
        "text": "<b>Prohibited AI Use:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Discrimination in recommendations",
          "Excluding certain groups",
          "Giving inferior options to protected classes",
          "Pricing discrimination",
          "Fraud detection with discriminatory bias"
        ]
      },
      {
        "t": "p",
        "text": "<b>If You Experience Bias:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Report to: ai-fairness@algorithec.ai",
          "Describe the issue",
          "Provide examples",
          "We investigate",
          "Corrective action taken",
          "You notified of resolution"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "PART 3: ONDC INTEGRATION POLICY"
      },
      {
        "t": "h",
        "level": 3,
        "text": "3.1 ONDC NEUTRALITY"
      },
      {
        "t": "p",
        "text": "<b>Algorithec Remains Neutral:</b>"
      },
      {
        "t": "ul",
        "items": [
          "No preference for any ONDC seller",
          "Rankings based on objective factors only",
          "No paid placement or preferential treatment",
          "Same evaluation criteria for all sellers",
          "No conflicts of interest",
          "Transparent ranking factors",
          "Appeal process available"
        ]
      },
      {
        "t": "p",
        "text": "<b>What We Don't Do:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Accept payment for better rankings",
          "Give preferential treatment to partners",
          "Hide negative reviews",
          "Manipulate ratings",
          "Exclude sellers arbitrarily",
          "Show bias toward certain sellers"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "3.2 SELLER DATA & INFORMATION"
      },
      {
        "t": "p",
        "text": "<b>Information We Collect About Sellers:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Product catalog (name, description, price)",
          "Ratings and reviews",
          "Response times",
          "Fulfillment metrics",
          "Return/refund rates",
          "Policy compliance",
          "Availability information",
          "Promotional offers"
        ]
      },
      {
        "t": "p",
        "text": "<b>Seller Data Use:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Ranking and evaluation",
          "Quality metrics",
          "Reliability assessment",
          "Recommendation training",
          "Performance analytics",
          "No sharing with competitors",
          "Confidential treatment",
          "ONDC data agreement compliance"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "3.3 SELLER DISPUTES & COMPLAINTS"
      },
      {
        "t": "p",
        "text": "<b>For Seller Issues:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Contact seller first (via ONDC)",
          "Algorithec facilitates, doesn't adjudicate",
          "Seller policies apply",
          "ONDC arbitration available",
          "Algorithec not liable for seller disputes",
          "We provide contact information",
          "We facilitate communication"
        ]
      },
      {
        "t": "p",
        "text": "<b>If Seller Violates Law:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Report to ONDC",
          "We preserve evidence",
          "Cooperate with ONDC investigation",
          "May limit seller access (if warranted)",
          "Support to affected users"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "3.4 PLATFORM INTEGRATION REQUIREMENTS"
      },
      {
        "t": "p",
        "text": "<b>Algorithec Guarantees:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Real-time price sync (within 5 minutes)",
          "Inventory accuracy",
          "Current discounts",
          "Delivery estimates",
          "Order placement confirmation",
          "Status tracking integration",
          "Return/refund processing",
          "Customer support liaison"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "PART 4: DATA SECURITY IN AI CONTEXT"
      },
      {
        "t": "h",
        "level": 3,
        "text": "4.1 AI-SPECIFIC DATA PROTECTION"
      },
      {
        "t": "p",
        "text": "<b>Data Used for AI:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Anonymized decision patterns",
          "Aggregate user preferences",
          "Aggregated behavior signals",
          "Performance metrics",
          "No individual identification"
        ]
      },
      {
        "t": "p",
        "text": "<b>Data NOT Used for AI:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Personal identifiable information",
          "Payment details",
          "Contact information",
          "Location history (only current location)",
          "Medical/sensitive information",
          "Behavioral targeting without consent"
        ]
      },
      {
        "t": "p",
        "text": "<b>Your Control:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Opt-out of AI training",
          "Settings Privacy AI Training",
          "Effective immediately",
          "May reduce recommendation quality",
          "No penalty for opting out"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "4.2 MODEL SECURITY"
      },
      {
        "t": "p",
        "text": "<b>We Protect:</b>"
      },
      {
        "t": "ul",
        "items": [
          "AI models from theft",
          "Training data from unauthorized access",
          "Algorithm from reverse engineering",
          "Proprietary processes",
          "Trade secrets"
        ]
      },
      {
        "t": "p",
        "text": "<b>We Don't:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Share models with third parties",
          "Make models publicly available",
          "Disclose training procedures",
          "Reveal ranking formulas",
          "Expose proprietary data"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "PART 5: COMPLIANCE & ENFORCEMENT"
      },
      {
        "t": "h",
        "level": 3,
        "text": "5.1 INVESTIGATION PROCESS"
      },
      {
        "t": "p",
        "text": "<b>For Violations:</b>"
      },
      {
        "t": "ul",
        "items": [
          "<b>Detection</b> - Automated systems and user reports",
          "<b>Notification</b> - User informed of alleged violation",
          "<b>Investigation</b> - Evidence gathered, reviewed",
          "<b>Review</b> - Violation confirmed or dismissed",
          "<b>Response</b> - Warning, suspension, or termination",
          "<b>Appeal</b> - User can appeal within 30 days",
          "<b>Resolution</b> - Final decision provided"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "5.2 APPEAL PROCESS"
      },
      {
        "t": "p",
        "text": "<b>To Appeal:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Email: appeals@algorithec.ai",
          "Provide order/transaction ID",
          "Explain disagreement",
          "Provide supporting evidence",
          "Submit within 30 days"
        ]
      },
      {
        "t": "p",
        "text": "<b>Appeal Review:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Independent reviewer (not original decision maker)",
          "Full context considered",
          "User statement reviewed",
          "Evidence evaluated",
          "Decision upheld, reversed, or modified",
          "Final response within 30 days"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "5.3 RECORD RETENTION"
      },
      {
        "t": "p",
        "text": "We retain records of:"
      },
      {
        "t": "ul",
        "items": [
          "Violations and enforcement actions",
          "Appeals and outcomes",
          "Evidence (90 days minimum)",
          "Aggregate violation data (for trends)",
          "User warnings and suspensions"
        ]
      },
      {
        "t": "p",
        "text": "<b>Your Access:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Request your enforcement record",
          "Email: support@algorithec.ai",
          "Provided within 10 business days",
          "Subject to privacy protections"
        ]
      }
    ]
  },
  {
    "slug": "cookies",
    "title": "Cookie, Refund and Support Policy",
    "description": "Cookies we use, how refunds and cancellations work, and how to reach support.",
    "blocks": [
      {
        "t": "h",
        "level": 2,
        "text": "1.1 WHAT ARE COOKIES?"
      },
      {
        "t": "p",
        "text": "<b>Definition:</b> Cookies are small text files stored on your device when you visit our website or use our app. They contain data about your browsing activity, preferences, and login information."
      },
      {
        "t": "p",
        "text": "<b>How Cookies Work:</b>"
      },
      {
        "t": "ul",
        "items": [
          "You visit Algorithec",
          "Server sends cookie to your device",
          "Device stores cookie locally",
          "Next visit, device sends cookie back",
          "We recognize you and personalize experience",
          "Cookie may expire or be deleted"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "1.2 TYPES OF COOKIES WE USE"
      },
      {
        "t": "h",
        "level": 3,
        "text": "A. Essential/Functional Cookies"
      },
      {
        "t": "p",
        "text": "<b>Purpose:</b> Make Platform work properly"
      },
      {
        "t": "ul",
        "items": [
          "Session management",
          "Authentication (login/logout)",
          "Security functions",
          "Error messages",
          "Basic preferences"
        ]
      },
      {
        "t": "p",
        "text": "<b>Duration:</b> Session (deleted when you close browser)"
      },
      {
        "t": "p",
        "text": "<b>Can Be Disabled:</b> No, Platform won't work without these"
      },
      {
        "t": "p",
        "text": "<b>Examples:</b>"
      },
      {
        "t": "ul",
        "items": [
          "session_id - Keeps you logged in",
          "csrf_token - Protects against attacks",
          "language_preference - Remembers your language",
          "theme_preference - Remembers light/dark mode"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "B. Analytics Cookies"
      },
      {
        "t": "p",
        "text": "<b>Purpose:</b> Understand how you use Platform"
      },
      {
        "t": "ul",
        "items": [
          "Track pages visited",
          "Measure feature usage",
          "Analyze user behavior",
          "Identify popular features",
          "Improve user experience",
          "Fix bugs",
          "Optimize performance"
        ]
      },
      {
        "t": "p",
        "text": "<b>Duration:</b> 12-24 months"
      },
      {
        "t": "p",
        "text": "<b>Can Be Disabled:</b> Yes, Settings Privacy Analytics"
      },
      {
        "t": "p",
        "text": "<b>Partners:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Google Analytics",
          "Mixpanel",
          "Amplitude",
          "(These track anonymized data)"
        ]
      },
      {
        "t": "p",
        "text": "<b>Information Collected:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Pages/screens visited",
          "Time on page",
          "Clicks and interactions",
          "Device type and OS",
          "Browser type",
          "Geographic location (approximate)",
          "Referral source"
        ]
      },
      {
        "t": "p",
        "text": "<b>NOT Collected:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Personal information",
          "Payment details",
          "Sensitive data",
          "Identifiable information (without consent)"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "C. Advertising & Remarketing Cookies"
      },
      {
        "t": "p",
        "text": "<b>Purpose:</b> Show relevant recommendations and ads"
      },
      {
        "t": "ul",
        "items": [
          "Personalized recommendations",
          "Behavioral targeting",
          "Cross-site tracking (with permission)",
          "Advertising conversion tracking",
          "Retargeting ads",
          "Interest-based suggestions"
        ]
      },
      {
        "t": "p",
        "text": "<b>Duration:</b> 3-12 months"
      },
      {
        "t": "p",
        "text": "<b>Can Be Disabled:</b> Yes, Settings Privacy Advertising"
      },
      {
        "t": "p",
        "text": "<b>Partners:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Google Ads",
          "Facebook Ads",
          "Other ad networks",
          "(Subject to their privacy policies)"
        ]
      },
      {
        "t": "p",
        "text": "<b>Information Shared:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Browsing behavior",
          "Product interests",
          "Category preferences",
          "(Not personal information)"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "D. Social Media Cookies"
      },
      {
        "t": "p",
        "text": "<b>Purpose:</b> Enable social features"
      },
      {
        "t": "ul",
        "items": [
          "Facebook/Instagram login",
          "Google login",
          "Social sharing",
          "LinkedIn integration",
          "Twitter integration"
        ]
      },
      {
        "t": "p",
        "text": "<b>Duration:</b> Varies (usually session + 30 days)"
      },
      {
        "t": "p",
        "text": "<b>Can Be Disabled:</b> Don't connect social accounts"
      },
      {
        "t": "p",
        "text": "<b>Information:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Basic profile info",
          "Email address",
          "Profile picture",
          "Friends/connections"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "E. Performance Cookies"
      },
      {
        "t": "p",
        "text": "<b>Purpose:</b> Improve Platform speed"
      },
      {
        "t": "ul",
        "items": [
          "Load time monitoring",
          "Error tracking",
          "Crash reporting",
          "Performance metrics",
          "Latency measurement"
        ]
      },
      {
        "t": "p",
        "text": "<b>Duration:</b> 30-90 days"
      },
      {
        "t": "p",
        "text": "<b>Can Be Disabled:</b> Settings Privacy Performance"
      },
      {
        "t": "p",
        "text": "<b>Partners:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Sentry (error tracking)",
          "Rollbar (crash reporting)",
          "New Relic (monitoring)"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "1.3 COOKIE MANAGEMENT"
      },
      {
        "t": "h",
        "level": 3,
        "text": "How to Manage Cookies"
      },
      {
        "t": "p",
        "text": "<b>In Algorithec:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Settings Privacy",
          "Cookie Preferences",
          "Toggle each category on/off",
          "Essential cookies cannot be disabled",
          "Changes apply immediately",
          "Some features may be limited"
        ]
      },
      {
        "t": "p",
        "text": "<b>In Your Browser:</b>"
      },
      {
        "t": "p",
        "text": "<b>Chrome/Edge/Firefox:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Settings Privacy",
          "Cookies and Site Data",
          "View all cookies",
          "Delete specific cookies",
          "Block cookies from sites",
          "Allow/block individual cookies"
        ]
      },
      {
        "t": "p",
        "text": "<b>Safari:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Preferences Privacy",
          "Cookies and Website Data",
          "Manage Website Data",
          "Remove cookies"
        ]
      },
      {
        "t": "p",
        "text": "<b>Mobile:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Settings App Permission",
          "Disable cookies in-app browser",
          "Clear app cache and data"
        ]
      },
      {
        "t": "p",
        "text": "<b>Third-Party Tools:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Cookie manager apps",
          "Privacy extensions (uBlock Origin, Ghostery)",
          "VPN services (mask IP, may block cookies)",
          "Do Not Track (DNT) browser settings"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "1.4 DO NOT TRACK (DNT)"
      },
      {
        "t": "p",
        "text": "<b>If You Enable DNT:</b>"
      },
      {
        "t": "ul",
        "items": [
          "We honor DNT signals",
          "We don't track analytics",
          "We don't show targeted ads",
          "We don't use advertising cookies",
          "We keep essential cookies only",
          "Platform functionality maintained"
        ]
      },
      {
        "t": "p",
        "text": "<b>How to Enable DNT:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Chrome: Settings Privacy Do Not Track",
          "Firefox: Preferences Privacy Send \"Do Not Track\"",
          "Safari: Preferences Privacy Ask websites not to track",
          "Edge: Settings Privacy Tracking Prevention"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "1.5 YOUR RIGHTS & CHOICES"
      },
      {
        "t": "p",
        "text": "<b>You Have Right To:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Know what cookies we use",
          "Disable non-essential cookies",
          "Delete all cookies anytime",
          "Request cookie list",
          "Block specific cookies",
          "Opt-out of tracking",
          "Use private/incognito mode",
          "Delete cookies regularly"
        ]
      },
      {
        "t": "p",
        "text": "<b>Privacy Implications:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Disabling cookies = less personalized experience",
          "No targeting = generic recommendations",
          "No memory of preferences = re-enter info",
          "Analytics disabled = we can't improve features",
          "No retargeting = relevant ads disappear"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "1.6 THIRD-PARTY COOKIES"
      },
      {
        "t": "p",
        "text": "<b>Third Parties May Place Cookies:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Advertising networks",
          "Analytics providers",
          "Social media platforms",
          "Payment processors",
          "Affiliate partners"
        ]
      },
      {
        "t": "p",
        "text": "<b>Their Privacy Policies Apply:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Not Algorithec policies",
          "They control their cookies",
          "Review their privacy policies",
          "Opt-out through their services",
          "We don't control them"
        ]
      },
      {
        "t": "p",
        "text": "<b>Opting Out:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Individual provider opt-outs",
          "Network Advertising Initiative (NAI)",
          "Digital Advertising Alliance (DAA)",
          "Your advertising preferences"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "1.7 INTERNATIONAL COOKIES"
      },
      {
        "t": "p",
        "text": "<b>If Using From Outside India:</b>"
      },
      {
        "t": "ul",
        "items": [
          "GDPR cookie rules may apply (if in EU)",
          "Explicit consent required for some cookies",
          "Cookiebot or similar consent manager used",
          "Your choices respected across borders",
          "Same cookie types apply globally"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "2.1 OUR ROLE IN REFUNDS"
      },
      {
        "t": "p",
        "text": "<b>Important Distinction:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Algorithec acts as agent for you",
          "ONDC sellers/partners fulfill transactions",
          "THEIR policies govern refunds",
          "We facilitate, don't arbitrate",
          "Seller's refund policy applies",
          "Algorithec not liable for seller's actions"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "2.2 CANCELLATION BEFORE PAYMENT"
      },
      {
        "t": "p",
        "text": "<b>You Can Cancel Anytime Before Payment:</b>"
      },
      {
        "t": "ul",
        "items": [
          "AI recommendation shown",
          "Before you click \"Confirm\"",
          "Simply close or go back",
          "No charges incurred",
          "No cancellation fee",
          "Instant, no approval needed"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "2.3 CANCELLATION AFTER PAYMENT"
      },
      {
        "t": "p",
        "text": "<b>Immediate Cancellation (Within 5 Minutes):</b>"
      },
      {
        "t": "ul",
        "items": [
          "Click \"Cancel Order\" in app",
          "Refund initiated immediately",
          "Full refund, no deductions",
          "Seller notified of cancellation",
          "Usually processed same day",
          "No questions asked"
        ]
      },
      {
        "t": "p",
        "text": "<b>Cancellation After 5 Minutes:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Depends on seller and category",
          "May be allowed if not processed",
          "May incur cancellation fee (seller's policy)",
          "Contact seller via ONDC for approval",
          "Refund if approved",
          "Algorithec facilitates only"
        ]
      },
      {
        "t": "p",
        "text": "<b>Cancellation After Processing:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Order may be shipped",
          "Return/refund policy applies",
          "Must contact seller",
          "Follow their return procedure",
          "Algorithec provides contact info",
          "Algorithec facilitates communication"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "2.4 REFUND PROCESSING TIMELINE"
      },
      {
        "t": "p",
        "text": "<b>Refund Approval:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Seller approves within 24-72 hours",
          "Depends on seller's policy",
          "May require return verification",
          "Inspection may be needed",
          "Check with seller for status"
        ]
      },
      {
        "t": "p",
        "text": "<b>Refund to Payment Method:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Once approved by seller",
          "Takes 3-7 business days to appear",
          "Card refunds: 3-5 days",
          "Bank transfers: 5-7 days",
          "UPI: 1-2 days",
          "Depends on bank, not Algorithec"
        ]
      },
      {
        "t": "p",
        "text": "<b>Total Timeline:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Best case: Same day (immediate cancellation)",
          "Typical: 5-10 business days",
          "Worst case: 15-20 business days",
          "May vary by payment method"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "2.5 NON-REFUNDABLE SITUATIONS"
      },
      {
        "t": "p",
        "text": "<b>The Following Are Usually Non-Refundable:</b>"
      },
      {
        "t": "ul",
        "items": [
          "<b>Services Delivered & Used</b>",
          "Food orders consumed",
          "Ride/travel completed",
          "Hotel stay completed",
          "Services rendered fully"
        ]
      },
      {
        "t": "ul",
        "items": [
          "<b>Digital Products</b>",
          "E-books accessed",
          "Software licenses activated",
          "Digital subscriptions used",
          "Digital downloads used"
        ]
      },
      {
        "t": "ul",
        "items": [
          "<b>Custom/Personalized Items</b>",
          "Personalized products",
          "Custom orders",
          "Made-to-order items",
          "Altered/modified items"
        ]
      },
      {
        "t": "ul",
        "items": [
          "<b>Time-Limited Offers</b>",
          "Expired promotional discounts",
          "Flash sale items (once used)",
          "Limited-time offers (once used)",
          "Clearance items (unless defective)"
        ]
      },
      {
        "t": "ul",
        "items": [
          "<b>Seller's Policy</b>",
          "Against seller's terms",
          "Final sale items",
          "As-is items",
          "Used/damaged items (your fault)"
        ]
      },
      {
        "t": "ul",
        "items": [
          "<b>Your Circumstances</b>",
          "Changed mind after delivery",
          "Found cheaper elsewhere",
          "Item more expensive than expected",
          "Packaging opened",
          "Used product returned"
        ]
      },
      {
        "t": "p",
        "text": "<b>Exceptions:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Defective/damaged goods",
          "Item not as described",
          "Major difference from picture",
          "Item not received (if proof available)",
          "Wrong item sent"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "2.6 DEFECTIVE/DAMAGED GOODS"
      },
      {
        "t": "p",
        "text": "<b>If Item Received Is:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Damaged or broken",
          "Defective or not working",
          "Not as described",
          "Missing parts",
          "Wrong item received"
        ]
      },
      {
        "t": "p",
        "text": "<b>How to Get Refund:</b>"
      },
      {
        "t": "ul",
        "items": [
          "<b>Document the Issue</b>",
          "Take photos/video",
          "Show packaging",
          "Show damage/defect",
          "Note missing items"
        ]
      },
      {
        "t": "ul",
        "items": [
          "<b>Contact Seller</b>",
          "Via ONDC app",
          "Provide photos",
          "Describe issue clearly",
          "Request replacement or refund"
        ]
      },
      {
        "t": "ul",
        "items": [
          "<b>Seller May:</b>",
          "Offer replacement",
          "Offer refund",
          "Deny (dispute)",
          "Require return first"
        ]
      },
      {
        "t": "ul",
        "items": [
          "<b>If Denied</b>",
          "Contact Algorithec support",
          "We escalate to seller",
          "If still denied, limited options",
          "Consumer complaint available"
        ]
      },
      {
        "t": "ul",
        "items": [
          "<b>Return Process</b>",
          "Seller arranges pickup or return shipping",
          "Your cost or seller's cost (depends on policy)",
          "Items must be in returnable condition",
          "Refund after verification",
          "Keep proof of return"
        ]
      },
      {
        "t": "p",
        "text": "<b>Algorithec's Role:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Facilitate communication",
          "Escalate if needed",
          "Provide seller contact",
          "Monitor for abuse",
          "Limited ability to compel refund"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "2.7 PARTIAL REFUNDS"
      },
      {
        "t": "p",
        "text": "<b>You May Get Partial Refund For:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Item damaged (seller's estimate)",
          "Item defective (seller's assessment)",
          "Missing items (partial refund)",
          "Item returned in used condition",
          "Restocking fees applied",
          "Return shipping costs"
        ]
      },
      {
        "t": "p",
        "text": "<b>How Partial Refunds Work:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Seller assesses condition",
          "Deductions for damage/wear",
          "Deductions for return costs",
          "Remaining amount refunded",
          "You receive breakdown of deductions",
          "Can dispute calculation"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "2.8 REFUND DISPUTES"
      },
      {
        "t": "p",
        "text": "<b>If Refund Disputed:</b>"
      },
      {
        "t": "ul",
        "items": [
          "<b>Contact Seller First</b>",
          "Provide details",
          "Provide photos",
          "Request reconsideration",
          "Allow 5-7 days response"
        ]
      },
      {
        "t": "ul",
        "items": [
          "<b>Escalate to ONDC</b>",
          "File dispute on platform",
          "Provide evidence",
          "ONDC investigates",
          "ONDC decides"
        ]
      },
      {
        "t": "ul",
        "items": [
          "<b>Algorithec Support</b>",
          "We can facilitate only",
          "We provide evidence",
          "We don't arbitrate",
          "ONDC's decision is final"
        ]
      },
      {
        "t": "ul",
        "items": [
          "<b>Consumer Complaint</b>",
          "File with consumer forum",
          "District Consumer Commission (for <₹1 Cr)",
          "Available under Consumer Protection Act, 2019"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "2.9 SPECIAL CIRCUMSTANCES"
      },
      {
        "t": "h",
        "level": 3,
        "text": "Gift Cards & Vouchers:"
      },
      {
        "t": "ul",
        "items": [
          "Non-refundable unless purchased from Algorithec directly",
          "Check issuer's policy",
          "Usually can't exchange for cash",
          "May expire per issuer's terms"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "Subscription Services:"
      },
      {
        "t": "ul",
        "items": [
          "May be refundable if within free trial",
          "Otherwise non-refundable",
          "Cancel anytime to avoid next charge",
          "Pro-rated refunds for monthly subscriptions",
          "Read subscription terms carefully"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "Installment Payments:"
      },
      {
        "t": "ul",
        "items": [
          "Cancellation refunds all installments (if allowed)",
          "Continue installments even if item returned",
          "Contact seller immediately if canceling",
          "Depending on approval, may waive remaining"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "Bundle Deals:"
      },
      {
        "t": "ul",
        "items": [
          "Usually all-or-nothing",
          "Can't cherry-pick items to return",
          "Return entire bundle for full refund (if allowed)",
          "Partial returns may be non-refundable"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "2.10 REFUND TO ALGORITHEC CREDITS"
      },
      {
        "t": "p",
        "text": "<b>Algorithec Store Credit:</b>"
      },
      {
        "t": "ul",
        "items": [
          "You may request credits instead of refund",
          "Faster processing (1-2 days)",
          "Can use for future purchases",
          "No expiration (unless noted)",
          "Can't be withdrawn as cash",
          "You can delete credits (forfeit balance)"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "3.1 SUPPORT CHANNELS"
      },
      {
        "t": "h",
        "level": 3,
        "text": "A. In-App Support"
      },
      {
        "t": "ul",
        "items": [
          "Chat with support agent",
          "Real-time responses",
          "Issue resolution",
          "Available 24/7",
          "Fastest option"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "B. Email Support"
      },
      {
        "t": "ul",
        "items": [
          "Email: support@algorithec.ai",
          "Professional response",
          "Detailed explanation",
          "Ticketing system",
          "Response within 24 hours"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "C. Phone Support"
      },
      {
        "t": "ul",
        "items": [
          "+91 7396144250",
          "Monday-Friday, 10 AM - 6 PM IST",
          "Direct with support team",
          "For urgent issues",
          "May have wait time"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "D. Social Media Support"
      },
      {
        "t": "ul",
        "items": [
          "@Algorithec on Twitter/Instagram",
          "Not recommended for urgent issues",
          "Public-facing, privacy limited",
          "May take 24-48 hours",
          "Better for feedback/suggestions"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "3.2 RESPONSE TIME COMMITMENTS"
      },
      {
        "t": "table",
        "head": [
          "Issue Type",
          "Response Time",
          "Resolution Time"
        ],
        "rows": [
          [
            "Account/Login",
            "2 hours",
            "Same day"
          ],
          [
            "Payment Issues",
            "2 hours",
            "Same day"
          ],
          [
            "Order Status",
            "4 hours",
            "24 hours"
          ],
          [
            "Refund Inquiry",
            "4 hours",
            "3-5 days"
          ],
          [
            "Technical Issues",
            "4 hours",
            "24 hours"
          ],
          [
            "General Questions",
            "24 hours",
            "48 hours"
          ],
          [
            "Feedback/Suggestions",
            "48 hours",
            "No timeline"
          ]
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "3.3 SUPPORT SCOPE"
      },
      {
        "t": "p",
        "text": "<b>We Can Help With:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Account issues (reset, access, profile)",
          "Payment/billing questions",
          "Order status and tracking",
          "Refund status",
          "Platform technical issues",
          "AI recommendations",
          "Onboarding help",
          "Feature explanations",
          "Preference management",
          "Contact with sellers (facilitation only)"
        ]
      },
      {
        "t": "p",
        "text": "<b>We Cannot Help With:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Seller disputes (facilitate, don't arbitrate)",
          "Return procedures (seller handles)",
          "Shipping damages (seller/logistics)",
          "Item quality issues (seller responsibility)",
          "Pricing disputes (ONDC seller sets price)",
          "Delivery delays (logistics company)",
          "Chargeback disputes (bank issue)"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "3.4 SUPPORT DOCUMENTATION"
      },
      {
        "t": "p",
        "text": "<b>Provide When Contacting Support:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Order ID (most helpful)",
          "Issue description (clear, detailed)",
          "Screenshots (for technical issues)",
          "Timeline (when did it happen)",
          "Steps taken so far",
          "Expected outcome",
          "Contact information",
          "Your account email"
        ]
      },
      {
        "t": "p",
        "text": "<b>Helps Us:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Locate your account quickly",
          "Understand issue clearly",
          "Resolve faster",
          "Prevent back-and-forth",
          "Escalate appropriately"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "3.5 ESCALATION PROCESS"
      },
      {
        "t": "p",
        "text": "<b>Level 1: Frontline Support</b>"
      },
      {
        "t": "ul",
        "items": [
          "Regular support agents",
          "Basic troubleshooting",
          "Common issue resolution",
          "90% issues resolved here"
        ]
      },
      {
        "t": "p",
        "text": "<b>Level 2: Specialist Support</b>"
      },
      {
        "t": "ul",
        "items": [
          "If not resolved by Level 1",
          "Topic specialist assigned",
          "More in-depth investigation",
          "9% issues resolved here"
        ]
      },
      {
        "t": "p",
        "text": "<b>Level 3: Management Escalation</b>"
      },
      {
        "t": "ul",
        "items": [
          "Still not resolved",
          "Manager review",
          "Potential compensation",
          "Policy exceptions",
          "<1% issues reach here"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "3.6 SUPPORT FEEDBACK"
      },
      {
        "t": "p",
        "text": "<b>We Welcome:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Feedback on support quality",
          "Compliments for agents",
          "Complaints about service",
          "Suggestions for improvement",
          "Service ratings after support"
        ]
      },
      {
        "t": "p",
        "text": "<b>How to Leave Feedback:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Support ticket survey (post-issue)",
          "Email: feedback@algorithec.ai",
          "In-app feedback form",
          "Social media (@Algorithec)"
        ]
      },
      {
        "t": "p",
        "text": "<b>What We Do:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Read all feedback",
          "Train agents on issues",
          "Implement suggestions",
          "Recognize good agents",
          "Improve processes"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "3.7 COMPLAINT & GRIEVANCE PROCEDURE"
      },
      {
        "t": "p",
        "text": "<b>For Serious Issues Not Resolved:</b>"
      },
      {
        "t": "ul",
        "items": [
          "<b>Formal Grievance Filing</b>",
          "Email: grievance@algorithec.ai",
          "Subject: \"Formal Grievance\"",
          "Describe issue and impact",
          "Include order IDs",
          "Specify desired resolution"
        ]
      },
      {
        "t": "ul",
        "items": [
          "<b>Grievance Officer Assignment</b>",
          "Assigned within 48 hours",
          "Independent investigation",
          "Contact you within 5 days",
          "Investigation within 30 days"
        ]
      },
      {
        "t": "ul",
        "items": [
          "<b>Investigation Process</b>",
          "Review all evidence",
          "Interview relevant team members",
          "Check Platform systems",
          "Consult policies",
          "Determine resolution"
        ]
      },
      {
        "t": "ul",
        "items": [
          "<b>Response & Resolution</b>",
          "Written response provided",
          "Explanation of findings",
          "Resolution offered",
          "Compensation if applicable",
          "Timeline for action"
        ]
      },
      {
        "t": "ul",
        "items": [
          "<b>Appeal Process</b>",
          "If unsatisfied with resolution",
          "Request second review",
          "Different reviewer assigned",
          "Final decision within 15 days",
          "No further internal appeals"
        ]
      },
      {
        "t": "ul",
        "items": [
          "<b>Regulatory Complaints</b>",
          "If still unsatisfied",
          "File with Consumer Commission",
          "Or with Data Protection Authority",
          "Legal remedies available",
          "Algorithec will cooperate"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "3.8 SUPPORT ESCALATION RIGHTS"
      },
      {
        "t": "p",
        "text": "<b>You Have Right To:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Speak with supervisor",
          "Request different agent",
          "Request escalation",
          "Get written explanation",
          "Appeal decisions",
          "File formal complaint",
          "Contact regulatory bodies",
          "Legal recourse"
        ]
      },
      {
        "t": "p",
        "text": "<b>We Commit To:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Treating you respectfully",
          "Taking issues seriously",
          "Fair and impartial investigation",
          "Timely responses",
          "Professional conduct",
          "Transparency about findings",
          "Proper documentation"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "3.9 SUPPORT AGENT CODE OF CONDUCT"
      },
      {
        "t": "p",
        "text": "<b>Our Agents Will:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Be professional and courteous",
          "Respect your time",
          "Explain clearly",
          "Listen carefully",
          "Acknowledge concerns",
          "Provide honest assessment",
          "Follow up on commitments",
          "Maintain confidentiality"
        ]
      },
      {
        "t": "p",
        "text": "<b>Agents Will Not:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Be rude or dismissive",
          "Make promises they can't keep",
          "Blame you without justification",
          "Refuse to investigate",
          "Ignore complaints",
          "Share your information",
          "Misrepresent policies",
          "Discriminate"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "3.10 CONTACTING CUSTOMER SUPPORT"
      },
      {
        "t": "p",
        "text": "<b>Primary Contact Methods:</b>"
      },
      {
        "t": "p",
        "text": "<b>Email:</b> support@algorithec.ai <b>Phone:</b> +91 7396144250 <b>Hours:</b> Monday-Friday, 10 AM - 6 PM IST <b>In-App Chat:</b> Available 24/7 <b>Website:</b> www.algorithec.ai (Contact Us form)"
      },
      {
        "t": "p",
        "text": "<b>Grievance Officer:</b> <b>Email:</b> grievance@algorithec.ai <b>Response:</b> Within 5 days <b>Investigation:</b> 30 days"
      },
      {
        "t": "p",
        "text": "<b>Executive Escalation:</b> <b>Email:</b> escalation@algorithec.ai <b>Contact:</b> CEO's Office <b>For:</b> Serious unresolved issues only"
      }
    ]
  },
  {
    "slug": "security",
    "title": "Security, Accessibility and Breach Policy",
    "description": "How we protect your data, how we approach accessibility, and what happens after a breach.",
    "blocks": [
      {
        "t": "h",
        "level": 2,
        "text": "1.1 OUR SECURITY COMMITMENT"
      },
      {
        "t": "p",
        "text": "Algorithec is committed to protecting your data and information from unauthorized access, disclosure, alteration, and destruction. We implement industry-standard security measures and continuously improve our security posture."
      },
      {
        "t": "p",
        "text": "<b>Our Principles:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Protect user data as highest priority",
          "Regular security audits and testing",
          "Employee training on security",
          "Transparent about breaches",
          "Compliance with security standards",
          "Continuous improvement mindset"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "1.2 DATA ENCRYPTION"
      },
      {
        "t": "h",
        "level": 3,
        "text": "In Transit (Data Moving)"
      },
      {
        "t": "p",
        "text": "<b>HTTPS/TLS Encryption:</b>"
      },
      {
        "t": "ul",
        "items": [
          "All connections use HTTPS",
          "TLS 1.2 or higher",
          "256-bit encryption minimum",
          "Secure certificate from trusted provider",
          "Automatic HTTPS redirect",
          "No unencrypted data transmission"
        ]
      },
      {
        "t": "p",
        "text": "<b>API Endpoints:</b>"
      },
      {
        "t": "ul",
        "items": [
          "All APIs use HTTPS only",
          "No HTTP endpoints available",
          "Certificate pinning (mobile apps)",
          "Token-based authentication",
          "Rate limiting to prevent abuse"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "At Rest (Data Stored)"
      },
      {
        "t": "p",
        "text": "<b>Database Encryption:</b>"
      },
      {
        "t": "ul",
        "items": [
          "AES-256 encryption",
          "Encrypted data at rest",
          "Encryption keys in secure key vault",
          "Separate key for each database",
          "Regular key rotation (annually)",
          "No plaintext passwords stored"
        ]
      },
      {
        "t": "p",
        "text": "<b>File Storage:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Encrypted file systems",
          "Encrypted backups",
          "Encrypted archives",
          "Access logs for all file access",
          "Automatic cleanup of old files"
        ]
      },
      {
        "t": "p",
        "text": "<b>Sensitive Data Encryption:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Payment information encrypted separately",
          "Government IDs encrypted",
          "Medical data encrypted separately",
          "Phone numbers encrypted",
          "SSNs/unique IDs encrypted",
          "Address data encrypted"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "1.3 ACCESS CONTROLS"
      },
      {
        "t": "h",
        "level": 3,
        "text": "Authentication"
      },
      {
        "t": "p",
        "text": "<b>User Authentication:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Email and strong password required",
          "Passwords hashed with bcrypt or scrypt",
          "Salt added to prevent rainbow tables",
          "Minimum 8 characters required",
          "Mixed case and numbers recommended",
          "No password reuse",
          "Password change every 90 days (recommended)"
        ]
      },
      {
        "t": "p",
        "text": "<b>Multi-Factor Authentication (MFA):</b>"
      },
      {
        "t": "ul",
        "items": [
          "Optional for users (enabled by default for admin)",
          "TOTP (Time-based One-Time Password) supported",
          "SMS/Email OTP available",
          "Recovery codes provided",
          "Backup methods available"
        ]
      },
      {
        "t": "p",
        "text": "<b>Session Management:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Session tokens secure and random",
          "Session timeout after 30 minutes inactivity",
          "Logout available anytime",
          "Sessions invalidated on password change",
          "One active session per device (optional security setting)"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "Authorization"
      },
      {
        "t": "p",
        "text": "<b>Role-Based Access Control:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Admin (full access)",
          "Support (limited to support functions)",
          "Data Analyst (analytics only)",
          "Finance (billing/payments only)",
          "Engineer (code/systems only)",
          "No cross-role access",
          "Access logs for all activities"
        ]
      },
      {
        "t": "p",
        "text": "<b>Principle of Least Privilege:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Employees have minimum necessary access",
          "Access tied to specific job function",
          "Regular access reviews",
          "Immediate revocation upon termination",
          "Separation of duties"
        ]
      },
      {
        "t": "p",
        "text": "<b>Data Access Restrictions:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Limited access to personal data",
          "Anonymized data for analytics",
          "No production data in development",
          "Encryption of all sensitive data",
          "Access logs and monitoring"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "1.4 EMPLOYEE & VENDOR SECURITY"
      },
      {
        "t": "h",
        "level": 3,
        "text": "Background Checks"
      },
      {
        "t": "ul",
        "items": [
          "Criminal background check",
          "Verification of employment history",
          "Reference checks",
          "Education verification",
          "Credit check (for financial roles)",
          "Continuous monitoring for new violations"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "Confidentiality Agreements"
      },
      {
        "t": "ul",
        "items": [
          "All employees sign NDA",
          "Covers company and user data",
          "Violations result in termination",
          "Legal action for breaches",
          "Non-disclosure clause survives employment"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "Access Training"
      },
      {
        "t": "ul",
        "items": [
          "Security training for all employees",
          "Annual refresher training",
          "Phishing awareness training",
          "Data handling procedures",
          "Incident response training",
          "Password security training"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "Vendor Management"
      },
      {
        "t": "ul",
        "items": [
          "Security questionnaire required",
          "SOC 2 or ISO 27001 certification required",
          "Penetration testing performed",
          "Regular security audits",
          "Contractual security requirements",
          "Insurance requirements",
          "Immediate suspension for breaches"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "1.5 INFRASTRUCTURE SECURITY"
      },
      {
        "t": "h",
        "level": 3,
        "text": "Network Security"
      },
      {
        "t": "ul",
        "items": [
          "Firewalls (hardware and software)",
          "Intrusion detection systems",
          "Intrusion prevention systems",
          "DDoS protection",
          "WAF (Web Application Firewall)",
          "VPN for remote access",
          "Network segmentation",
          "Isolated test environments"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "Server Security"
      },
      {
        "t": "ul",
        "items": [
          "Regular OS patching",
          "Security updates applied immediately",
          "Minimal services running",
          "Unused services disabled",
          "Hardened configurations",
          "Regular security scanning",
          "Vulnerability management",
          "Patch management policy"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "Cloud Security"
      },
      {
        "t": "ul",
        "items": [
          "AWS/Google Cloud used with security best practices",
          "Security groups configured properly",
          "API authentication required",
          "Encryption enabled",
          "Monitoring and logging",
          "DDoS protection",
          "Regular security assessments",
          "Compliance certifications"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "Database Security"
      },
      {
        "t": "ul",
        "items": [
          "Encrypted connections only",
          "Authentication required",
          "SQL injection prevention",
          "Data validation",
          "Principle of least privilege",
          "No production access from development",
          "Backup encryption",
          "Disaster recovery plan"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "1.6 APPLICATION SECURITY"
      },
      {
        "t": "h",
        "level": 3,
        "text": "Development Practices"
      },
      {
        "t": "ul",
        "items": [
          "Secure coding training",
          "Code reviews mandatory",
          "Peer review before deployment",
          "No hardcoded secrets",
          "Dependency scanning",
          "SAST (Static Application Security Testing)",
          "DAST (Dynamic Application Security Testing)"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "Vulnerability Management"
      },
      {
        "t": "ul",
        "items": [
          "Regular penetration testing (quarterly)",
          "Bug bounty program active",
          "Security researchers can report bugs",
          "Responsible disclosure process",
          "Vulnerability tracking system",
          "Remediation timeline",
          "Public disclosure after fix"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "API Security"
      },
      {
        "t": "ul",
        "items": [
          "Authentication required",
          "Rate limiting",
          "Input validation",
          "SQL injection protection",
          "XSS prevention",
          "CSRF protection",
          "Secure headers",
          "API versioning"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "Mobile App Security"
      },
      {
        "t": "ul",
        "items": [
          "App signing with certificate",
          "Secure storage of tokens",
          "Certificate pinning",
          "Obfuscation of sensitive code",
          "Secure communication",
          "Permission minimization",
          "No unintended data leaks",
          "Regular app updates"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "1.7 MONITORING & LOGGING"
      },
      {
        "t": "h",
        "level": 3,
        "text": "Security Logging"
      },
      {
        "t": "ul",
        "items": [
          "All access logged",
          "All changes logged",
          "All failures logged",
          "Logs retained 90 days minimum",
          "Logs encrypted and archived",
          "Centralized log management",
          "Tamper detection"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "Real-Time Monitoring"
      },
      {
        "t": "ul",
        "items": [
          "24/7 security monitoring",
          "Automated alert systems",
          "Anomaly detection",
          "Suspicious activity flags",
          "Incident response team alerted",
          "Manual review of alerts",
          "Quarterly trend analysis"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "Audit Trails"
      },
      {
        "t": "ul",
        "items": [
          "User login/logout logged",
          "Data access logged",
          "Data modification logged",
          "Deletion events logged",
          "Admin actions logged",
          "Accessible to authorized users",
          "Cannot be altered"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "1.8 INCIDENT RESPONSE"
      },
      {
        "t": "h",
        "level": 3,
        "text": "Security Incidents"
      },
      {
        "t": "p",
        "text": "<b>Definition:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Unauthorized access or use",
          "Data breach or potential breach",
          "System compromise",
          "Malware infection",
          "DDoS attack",
          "Ransomware attack",
          "Any suspicious activity"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "Response Plan"
      },
      {
        "t": "p",
        "text": "<b>Immediate Actions (First Hour):</b>"
      },
      {
        "t": "ul",
        "items": [
          "Isolate affected systems",
          "Stop ongoing attacks",
          "Preserve evidence",
          "Assess severity",
          "Activate incident team",
          "Begin containment"
        ]
      },
      {
        "t": "p",
        "text": "<b>Short-term (First 24 Hours):</b>"
      },
      {
        "t": "ul",
        "items": [
          "Complete investigation",
          "Determine scope",
          "Identify affected users",
          "Assess data exposure",
          "Begin remediation",
          "Prepare notifications"
        ]
      },
      {
        "t": "p",
        "text": "<b>Medium-term (1-7 Days):</b>"
      },
      {
        "t": "ul",
        "items": [
          "Complete remediation",
          "Fix vulnerabilities",
          "Restore systems",
          "Verify security",
          "Send notifications",
          "Document lessons learned"
        ]
      },
      {
        "t": "p",
        "text": "<b>Long-term (1-4 Weeks):</b>"
      },
      {
        "t": "ul",
        "items": [
          "Complete root cause analysis",
          "Implement preventive measures",
          "Monitor for related incidents",
          "Update security policies",
          "Conduct training",
          "Report to authorities if required"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "Notification (See Data Breach Policy Below)"
      },
      {
        "t": "h",
        "level": 2,
        "text": "1.9 SECURITY CERTIFICATIONS & STANDARDS"
      },
      {
        "t": "p",
        "text": "<b>Compliant With:</b>"
      },
      {
        "t": "ul",
        "items": [
          "ISO 27001 (or equivalent)",
          "SOC 2 Type II",
          "OWASP Top 10",
          "PCI DSS (for payment data)",
          "NIST Cybersecurity Framework",
          "Indian Standards (IS 15408)"
        ]
      },
      {
        "t": "p",
        "text": "<b>Regular Assessments:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Annual security audit",
          "Quarterly penetration tests",
          "Annual compliance audit",
          "Third-party security review",
          "Bug bounty findings",
          "Vendor assessments"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "1.10 YOUR SECURITY RESPONSIBILITIES"
      },
      {
        "t": "p",
        "text": "<b>You Should:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Use strong, unique passwords",
          "Enable multi-factor authentication",
          "Keep device software updated",
          "Use secure WiFi (not public)",
          "Log out when done",
          "Don't share credentials",
          "Report suspicious activity",
          "Update contact information",
          "Keep email secure",
          "Monitor account for unusual activity"
        ]
      },
      {
        "t": "p",
        "text": "<b>You Must Not:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Share passwords",
          "Use public WiFi for sensitive transactions",
          "Click suspicious links",
          "Download from untrusted sources",
          "Disable security features",
          "Give credentials to support (we won't ask)",
          "Ignore security warnings",
          "Store passwords insecurely"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "2.1 COMMITMENT TO ACCESSIBILITY"
      },
      {
        "t": "p",
        "text": "Algorithec is committed to making our Platform accessible to people with disabilities. We strive to meet WCAG 2.1 Level AA accessibility standards and continuously improve accessibility."
      },
      {
        "t": "h",
        "level": 2,
        "text": "2.2 WCAG COMPLIANCE"
      },
      {
        "t": "h",
        "level": 3,
        "text": "Web Accessibility Standards"
      },
      {
        "t": "p",
        "text": "<b>Perceivable:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Images have alt text",
          "Audio has captions",
          "Videos have transcripts",
          "Color not only indicator",
          "High contrast text",
          "Resizable text",
          "Content readable when zoomed"
        ]
      },
      {
        "t": "p",
        "text": "<b>Operable:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Keyboard navigation available",
          "No keyboard traps",
          "Skip navigation links",
          "Focus visible at all times",
          "No seizure-inducing content",
          "Touch targets appropriately sized (48x48px minimum)",
          "Sufficient spacing between buttons"
        ]
      },
      {
        "t": "p",
        "text": "<b>Understandable:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Clear language used",
          "Consistent navigation",
          "Predictable behavior",
          "Error messages clear",
          "Help and labels provided",
          "Content organized logically",
          "Instructions provided"
        ]
      },
      {
        "t": "p",
        "text": "<b>Robust:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Valid HTML code",
          "Proper semantic markup",
          "ARIA labels when needed",
          "Works with assistive technology",
          "Cross-browser compatible",
          "Mobile accessible",
          "Screen reader compatible"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "2.3 MOBILE APP ACCESSIBILITY"
      },
      {
        "t": "p",
        "text": "<b>iOS (VoiceOver Compatible):</b>"
      },
      {
        "t": "ul",
        "items": [
          "VoiceOver fully supported",
          "Proper element labeling",
          "Large text sizes supported",
          "High contrast mode",
          "Accessibility inspector tested",
          "Regular testing with VoiceOver"
        ]
      },
      {
        "t": "p",
        "text": "<b>Android (TalkBack Compatible):</b>"
      },
      {
        "t": "ul",
        "items": [
          "TalkBack fully supported",
          "Content description provided",
          "Proper heading structure",
          "Touch targets appropriately sized",
          "Regular testing with TalkBack"
        ]
      },
      {
        "t": "p",
        "text": "<b>General:</b>"
      },
      {
        "t": "ul",
        "items": [
          "No seizure-inducing animations",
          "Motion control alternatives",
          "Font scaling supported",
          "Color contrast WCAG AA+",
          "Keyboard navigation",
          "Voice control support"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "2.4 ACCESSIBILITY FEATURES"
      },
      {
        "t": "h",
        "level": 3,
        "text": "Text & Display Options"
      },
      {
        "t": "ul",
        "items": [
          "Adjustable text size (up to 200%)",
          "High contrast mode",
          "Dark mode option",
          "Serif/sans-serif font choice",
          "Letter/line spacing adjustment",
          "Reading guides (ruler, underline)"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "Audio & Visual"
      },
      {
        "t": "ul",
        "items": [
          "Captions for all videos",
          "Transcripts available",
          "Descriptions of images",
          "Sign language interpreter (on request)",
          "Audio descriptions (key content)",
          "No auto-playing audio/video"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "Navigation"
      },
      {
        "t": "ul",
        "items": [
          "Keyboard-only navigation possible",
          "Skip to main content link",
          "Logical tab order",
          "Breadcrumb navigation",
          "Clear headings",
          "Search function available"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "Forms"
      },
      {
        "t": "ul",
        "items": [
          "Clear labels for inputs",
          "Error messages specific",
          "Suggestions for corrections",
          "Required fields marked",
          "Adequate spacing",
          "Keyboard accessible",
          "Help text provided"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "2.5 ACCESSIBILITY SUPPORT"
      },
      {
        "t": "p",
        "text": "<b>Users Needing Assistance:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Email: accessibility@algorithec.ai",
          "Phone: +91 7396144250 (with relay service option)",
          "In-app chat available",
          "Response within 24 hours"
        ]
      },
      {
        "t": "p",
        "text": "<b>Accessibility Services:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Alternative formats available",
          "Document conversion (PDF text, etc.)",
          "Large print versions",
          "Braille documents (on request)",
          "Screen reader optimization",
          "Keyboard-only alternative",
          "Extended support time"
        ]
      },
      {
        "t": "p",
        "text": "<b>AI Accessibility:</b>"
      },
      {
        "t": "ul",
        "items": [
          "AI explanations available",
          "Non-visual decision flow",
          "Voice-based interaction (planned)",
          "Tactile feedback (mobile)",
          "Alternative decision format"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "2.6 ACCESSIBILITY STATEMENT"
      },
      {
        "t": "p",
        "text": "<b>What We've Done:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Extensive accessibility testing",
          "WCAG 2.1 Level AA compliance",
          "Third-party accessibility audit",
          "Continuous improvement",
          "Regular user feedback"
        ]
      },
      {
        "t": "p",
        "text": "<b>Known Issues:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Some third-party widgets may not be fully accessible",
          "Partner platform accessibility varies",
          "Older browsers may have limited support"
        ]
      },
      {
        "t": "p",
        "text": "<b>Planned Improvements:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Voice input (coming soon)",
          "Enhanced screen reader support",
          "More audio descriptions",
          "Improved mobile accessibility",
          "Accessibility AI (planned)"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "2.7 FEEDBACK ON ACCESSIBILITY"
      },
      {
        "t": "p",
        "text": "<b>Report Accessibility Issues:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Email: accessibility@algorithec.ai",
          "Include your device/browser",
          "Describe the issue in detail",
          "Provide steps to reproduce",
          "Suggest alternatives (if any)"
        ]
      },
      {
        "t": "p",
        "text": "<b>Resolution Timeline:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Acknowledge within 24 hours",
          "Investigate within 5 business days",
          "Provide solution/workaround within 15 days",
          "Implement fix in next update",
          "Notify you of resolution"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "3.1 DATA BREACH DEFINITION"
      },
      {
        "t": "p",
        "text": "<b>What Constitutes a Data Breach:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Unauthorized access to personal data",
          "Unauthorized disclosure of personal data",
          "Unauthorized modification of personal data",
          "Loss of personal data integrity or confidentiality",
          "Destruction of personal data (unintended)",
          "Any compromise of system security",
          "Theft of data (even if not accessed)"
        ]
      },
      {
        "t": "p",
        "text": "<b>NOT a Breach:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Authorized access",
          "Access within scope of authorization",
          "Intended operations",
          "Authorized testing or monitoring",
          "User-caused data loss"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "3.2 INVESTIGATION PROCESS"
      },
      {
        "t": "p",
        "text": "<b>Upon Suspected Breach:</b>"
      },
      {
        "t": "ul",
        "items": [
          "<b>Immediate Response (First Hour)</b>",
          "Isolate affected systems",
          "Preserve evidence",
          "Stop ongoing unauthorized activity",
          "Activate incident response team",
          "CEO and Legal notified",
          "Begin preliminary assessment"
        ]
      },
      {
        "t": "ul",
        "items": [
          "<b>Investigation (24-48 Hours)</b>",
          "Determine what data was accessed",
          "Identify affected individuals",
          "Determine scope of breach",
          "Assess sensitivity of data",
          "Calculate number of individuals affected",
          "Determine how breach occurred",
          "Identify vulnerabilities exploited"
        ]
      },
      {
        "t": "ul",
        "items": [
          "<b>Notification Preparation (48-72 Hours)</b>",
          "Prepare notification message",
          "Legal review of message",
          "Translation into regional languages",
          "Method of notification determined",
          "Contact information verified",
          "Response team prepared",
          "Regulatory notification prepared"
        ]
      },
      {
        "t": "ul",
        "items": [
          "<b>Notification (Within 72 Hours)</b>",
          "Send notifications to affected individuals",
          "Send to regulators (if required)",
          "Make public statement (if required)",
          "Maintain evidence"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "3.3 BREACH NOTIFICATION REQUIREMENTS"
      },
      {
        "t": "h",
        "level": 3,
        "text": "Notification Timeline"
      },
      {
        "t": "ul",
        "items": [
          "<b>72 hours maximum</b> after discovery",
          "Exceptions if law enforcement requests delay",
          "Earlier if practical (within 24 hours if possible)",
          "Reasonable efforts within timeframe",
          "Documented delays with justification"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "Notification Method"
      },
      {
        "t": "p",
        "text": "<b>Preferred (in order of preference):</b>"
      },
      {
        "t": "ul",
        "items": [
          "Email notification",
          "SMS notification",
          "Phone call",
          "In-app notification",
          "Mail (if email/phone unavailable)",
          "Public notice (if mass breach)"
        ]
      },
      {
        "t": "p",
        "text": "<b>Notification will be sent to:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Last known email address",
          "Last known phone number",
          "Mailing address on file"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "Notification Content"
      },
      {
        "t": "p",
        "text": "<b>Must Include:</b>"
      },
      {
        "t": "ul",
        "items": [
          "What happened (description of breach)",
          "When it happened (date/time discovered)",
          "What data was affected (list of data types)",
          "Who was affected (number of individuals)",
          "What to do (steps to protect yourself)",
          "Contact information (for questions)",
          "Credit monitoring (if applicable)",
          "What we're doing (remediation steps)",
          "How to file complaints (resources)"
        ]
      },
      {
        "t": "p",
        "text": "<b>Example Message:</b> > \"On [DATE], we discovered unauthorized access to our systems that may have exposed your personal information including [DATA TYPES]. We immediately took action to secure our systems and begin investigation. We recommend you [ACTIONS]. For more information, contact us at [CONTACT]. You can access free credit monitoring here [LINK].\""
      },
      {
        "t": "h",
        "level": 2,
        "text": "3.4 REGULATORY NOTIFICATION"
      },
      {
        "t": "h",
        "level": 3,
        "text": "If Breach Involves:"
      },
      {
        "t": "ul",
        "items": [
          "Personal data of Indian citizens",
          "Digital Personal Data Protection Act applies",
          "Notify Data Protection Authority (when established)",
          "Notify affected individuals",
          "Document notification"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "If Breach Affects EU Residents:"
      },
      {
        "t": "ul",
        "items": [
          "GDPR applies (72-hour rule)",
          "Notify EU supervisory authority",
          "Notify affected individuals",
          "Maintain records"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "If Breach Affects Other Countries:"
      },
      {
        "t": "ul",
        "items": [
          "Applicable laws may apply",
          "State/local authorities notified",
          "Affected individuals notified",
          "Documentation maintained"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "3.5 AFFECTED INDIVIDUAL RIGHTS"
      },
      {
        "t": "p",
        "text": "<b>You Have Right To:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Know what data was breached",
          "Know when it was breached",
          "Know how you can protect yourself",
          "Credit monitoring (if applicable)",
          "Damages compensation",
          "Legal remedies",
          "Request deletion of data",
          "File regulatory complaints"
        ]
      },
      {
        "t": "p",
        "text": "<b>We Provide:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Free credit monitoring (24-36 months)",
          "ID theft protection services",
          "Fraud alerts with credit bureaus",
          "Phone support for questions",
          "Expense reimbursement (documented costs)",
          "Legal referrals"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "3.6 PUBLIC NOTIFICATION"
      },
      {
        "t": "h",
        "level": 3,
        "text": "Media Statement"
      },
      {
        "t": "p",
        "text": "<b>For Significant Breaches (1000+ individuals):</b>"
      },
      {
        "t": "ul",
        "items": [
          "Press release issued",
          "Major news outlets notified",
          "Social media announcement",
          "Website notification",
          "Public statement from CEO",
          "FAQ about breach",
          "Resources for affected individuals"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "Public Transparency"
      },
      {
        "t": "ul",
        "items": [
          "Incident report published",
          "Remediation steps disclosed",
          "Timeline of events",
          "Root cause analysis (if not sensitive)",
          "Preventive measures implemented",
          "Lessons learned shared"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "3.7 REMEDIATION & PREVENTION"
      },
      {
        "t": "h",
        "level": 3,
        "text": "Immediate Remediation"
      },
      {
        "t": "ul",
        "items": [
          "Reset affected user passwords",
          "Invalidate tokens/sessions",
          "Force re-authentication",
          "Patch vulnerabilities",
          "Secure access control",
          "Monitor for further access",
          "Isolate affected systems"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "Short-Term (1-4 Weeks)"
      },
      {
        "t": "ul",
        "items": [
          "Complete security audit",
          "Penetration testing",
          "Vulnerability assessment",
          "Implement additional controls",
          "Enhanced monitoring",
          "Employee training",
          "Policy updates"
        ]
      },
      {
        "t": "h",
        "level": 3,
        "text": "Long-Term (1-6 Months)"
      },
      {
        "t": "ul",
        "items": [
          "Infrastructure upgrade",
          "Security architecture review",
          "Compliance improvements",
          "Technology modernization",
          "Process improvements",
          "Culture shift",
          "Third-party assessments"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "3.8 DOCUMENTATION & REPORTING"
      },
      {
        "t": "p",
        "text": "<b>We Maintain Records:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Date of discovery",
          "Date notification sent",
          "Number of individuals",
          "Data types affected",
          "Method of notification",
          "Regulatory notifications",
          "Remediation actions taken",
          "Root cause analysis",
          "Future prevention measures"
        ]
      },
      {
        "t": "p",
        "text": "<b>Available To:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Regulatory authorities",
          "Data Protection Officer",
          "Internal audit",
          "CEO and Board",
          "Legal team",
          "Law enforcement",
          "Affected individuals (upon request)"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "3.9 INSURANCE & LIABILITY"
      },
      {
        "t": "p",
        "text": "<b>We Have:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Cyber liability insurance",
          "Professional liability insurance",
          "Errors and omissions insurance",
          "Data breach insurance",
          "Coverage limits may apply",
          "Exclusions may apply",
          "Deductibles may apply"
        ]
      },
      {
        "t": "p",
        "text": "<b>Your Rights:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Sue for damages",
          "Statutory damages available",
          "Actual damages reimbursement",
          "Class action available",
          "Consumer legal remedies available",
          "Regulatory remedies available"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "3.10 TRANSPARENCY & ACCOUNTABILITY"
      },
      {
        "t": "p",
        "text": "<b>We Are Transparent About:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Breach incidents",
          "Investigation process",
          "Findings and conclusions",
          "Remediation actions",
          "Timeline of events",
          "Prevention measures",
          "Lessons learned"
        ]
      },
      {
        "t": "p",
        "text": "<b>We Accept Responsibility For:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Security failures under our control",
          "Negligence in data protection",
          "Inadequate security measures",
          "Failure to implement standards",
          "Delayed notifications",
          "Inadequate notifications"
        ]
      },
      {
        "t": "p",
        "text": "<b>We Do Not Accept Responsibility For:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Third-party breaches (unless our negligence)",
          "User-caused breaches",
          "Force majeure events",
          "Government hacking",
          "Sophisticated APT attacks (despite reasonable measures)"
        ]
      },
      {
        "t": "h",
        "level": 2,
        "text": "CONTACT FOR BREACH CONCERNS"
      },
      {
        "t": "p",
        "text": "<b>Security Incident Report:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Email: security@algorithec.ai",
          "Phone: +91 7396144250",
          "Marked \"URGENT: SECURITY INCIDENT\""
        ]
      },
      {
        "t": "p",
        "text": "<b>Data Protection Officer:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Email: dpo@algorithec.ai",
          "Within 24 hours"
        ]
      },
      {
        "t": "p",
        "text": "<b>CEO Escalation:</b>"
      },
      {
        "t": "ul",
        "items": [
          "Email: ceo@algorithec.ai",
          "For major incidents only"
        ]
      },
      {
        "t": "p",
        "text": "<b>© 2026 ALGORITHEC PRIVATE LIMITED. All Rights Reserved.</b>"
      },
      {
        "t": "p",
        "text": "<b>Last Updated: May 28, 2026</b> <b>Next Review: May 28, 2027</b>"
      },
      {
        "t": "p",
        "text": "<b>END OF SECURITY, ACCESSIBILITY & DATA BREACH POLICIES</b>"
      }
    ]
  }
];
