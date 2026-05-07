import React, { useState, useEffect } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { InstallMobile } from '@mui/icons-material';

const InstallPWA = ({ sx = {} }) => {
  const [prompt, setPrompt] = useState(null);

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setPrompt(e);
    };
    const onInstalled = () => setPrompt(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!prompt) return null;

  const handleInstall = async () => {
    prompt.prompt();
    await prompt.userChoice;
    setPrompt(null);
  };

  return (
    <Tooltip title="Install AutoPay on this device">
      <IconButton onClick={handleInstall} sx={sx}>
        <InstallMobile />
      </IconButton>
    </Tooltip>
  );
};

export default InstallPWA;
