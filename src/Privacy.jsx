
import React from "react";

export default function Privacy() {
  return (
    <div style={{ maxWidth: 700, margin: "60px auto", padding: "20px" }}>
      <h1>Privacy Policy – Fantasy Importer</h1>
      <p>
        Fantasy Importer does not collect, transmit, or share any personal data.
        All processing happens locally in your browser. Your league data is only
        read from pages you are already signed into (ESPN or Sleeper) and is
        never sent to any external server.
      </p>
      <p>
        The extension uses permissions such as activeTab, scripting, and storage
        solely to retrieve and display your fantasy league information within
        your LeagueVault account. No analytics, tracking, or advertising is
        included.
      </p>
      <p>
        If you have any questions, contact us at{" "}
        <a href="mailto:mikedoto1@gmail.com">mikedoto1@gmail.com</a>.
      </p>
    </div>
  );
}
