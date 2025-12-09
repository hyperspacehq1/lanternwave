"use client";
import React from "react";

export default function PrivacyPolicy() {
  return (
    <div className="boot-privacy-text">
      <h1 className="boot-privacy-title">Privacy Policy</h1>
      <p><strong>Last Updated:</strong> January 1, 2025</p>

      <p>
        LanternWave (“we,” “our,” “us”) operates an interactive tabletop 
        role-playing experience that may include optional SMS messaging during 
        gameplay. This Privacy Policy explains how we collect, use, and protect 
        information when you participate in our game or send SMS/text messages 
        to our system.
      </p>

      <p>
        By participating in a LanternWave game session or by texting our number, 
        you consent to the practices described in this Privacy Policy.
      </p>

      <hr />

      <h2>1. Information We Collect</h2>

      <h3>1.1 User-Provided Information</h3>
      <ul>
        <li>Phone number (only if you text us during a game session)</li>
        <li>Messages you send to the in-game NPC (“The Director”)</li>
        <li>Optional player name or character name</li>
        <li>Gameplay responses for interactive storytelling</li>
      </ul>

      <h3>1.2 Automatically Collected Information</h3>
      <ul>
        <li>Message timestamps</li>
        <li>Delivery status metadata from mobile carriers</li>
        <li>Game session identifiers</li>
      </ul>

      <p>
        We do <strong>not</strong> collect payment information, GPS location, 
        government identifiers, health data, or biometric information.
      </p>

      <hr />

      <h2>2. How We Use Your Information</h2>

      <p>We use SMS data solely to:</p>
      <ul>
        <li>Provide the in-game messaging experience</li>
        <li>Deliver replies from “The Director”</li>
        <li>Maintain temporary session records (logs, events, player data)</li>
        <li>Improve gameplay interactions</li>
        <li>Monitor system performance and security</li>
      </ul>

      <p>
        We do <strong>not</strong> use SMS data for marketing, advertising, 
        resale, lead generation, or any promotional purpose.
      </p>

      <hr />

      <h2>3. How We Share Information</h2>

      <p>
        <strong>
          Mobile information will not be shared with third parties/affiliates for 
          marketing or promotional purposes.
        </strong>
        Information sharing to subcontractors in support services (e.g., customer care, 
        hosting partners) is permitted.
      </p>

      <p>
        <strong>
          All other use-case categories exclude text messaging originator opt-in 
          data and consent; this information will not be shared with any third 
          parties.
        </strong>
      </p>

      <p>
        We may share minimal information only when required by law, regulations, 
        or to maintain system integrity.
      </p>

      <hr />

      <h2>4. SMS/Text Messaging Policy</h2>

      <h3>4.1 Opt-In</h3>
      <p>
        Users opt-in voluntarily by texting our number and replying YES after being 
        shown the SMS disclosure at the game table.
      </p>

      <h3>4.2 Opt-Out</h3>
      <p>
        You may opt-out at any time by texting: 
        <strong> STOP, END, QUIT, CANCEL, or UNSUBSCRIBE</strong>
      </p>

      <p>Opt-out confirmation message:</p>
      <pre className="boot-pre">
LanternWave: You have been unsubscribed and will no longer receive messages. 
Reply HELP for help.
      </pre>

      <h3>4.3 Help</h3>
      <p>Text <strong>HELP</strong> for support information.</p>

      <h3>4.4 Message Frequency</h3>
      <p>
        Messages occur only during active gameplay sessions and are conversational 
        in nature.
      </p>

      <h3>4.5 Fees</h3>
      <p>Your carrier’s standard message and data rates may apply.</p>

      <hr />

      <h2>5. Data Retention</h2>
      <p>
        We retain SMS session data only as long as required for gameplay, debugging, 
        or operational purposes.
      </p>
      <p>
        You may request deletion of your SMS-related data by contacting us using 
        the information below.
      </p>

      <hr />

      <h2>6. Children’s Privacy</h2>
      <p>
        LanternWave is intended for players aged 13 and older. We do not knowingly 
        collect data from children under 13.
      </p>

      <hr />

      <h2>7. Security</h2>
      <p>We use industry-standard protections including:</p>
      <ul>
        <li>HTTPS encryption</li>
        <li>Secure server infrastructure</li>
        <li>Access-controlled storage</li>
      </ul>
      <p>No security method is perfectly secure, but we strive to safeguard your data responsibly.</p>

      <hr />

      <h2>8. Contact Us</h2>
      <p>
        <strong>LanternWave Support</strong><br />
        Email: <a href="mailto:support@lanternwave.com">
          support@lanternwave.com
        </a><br />
        Website:{" "}
        <a href="https://lanternwave.com">
          https://lanternwave.com
        </a>
      </p>
    </div>
  );
}
