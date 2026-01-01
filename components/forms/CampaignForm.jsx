"use client";

import React, { useEffect, useState } from "react";
import CampaignPackageSelect from "@/components/CampaignPackageSelect";
import { withContext } from "@/lib/forms/withContext";
import { useCampaignContext } from "@/lib/campaign/campaignContext";

export default function CampaignForm({ record, onChange }) {
  const { campaign, setCampaignContext } = useCampaignContext();

  const isNew = !record?.id;

  /* ------------------------------------------------------------
     Guard: No campaign selected yet
  ------------------------------------------------------------ */
  if (!record && !campaign) {
    return (
      <div className="cm-detail-empty">
        <h3>No Campaign Selected</h3>
        <p>
          Please create a new campaign or select an existing one to begin.
        </p>
      </div>
    );
  }

  /* ------------------------------------------------------------
     Sync selected campaign into global context
  ------------------------------------------------------------ */
  useEffect(() => {
    if (record?.id && record?.name) {
      setCampaignContext({
        campaign: {
          id: record.id,
          name: record.name,
        },
        session: null,
      });
    }
  }, [record?.id]);

  const update = (field, value) => {
    onChange(
      withContext(
        {
          ...record,
          [field]: value,
        },
        {
          campaign_id: record.id,
        }
      )
    );
  };

  /* ---------------------------------------------
     Visual pulse on campaign change
  --------------------------------------------- */
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 800);
    return () => clearTimeout(t);
  }, [record?.id]);

  /* ---------------------------------------------
     Ensure default campaign package
  --------------------------------------------- */
  useEffect(() => {
    if (!record?.campaignPackage) {
      update("campaignPackage", "standard");
    }
  }, [record?.campaignPackage])
