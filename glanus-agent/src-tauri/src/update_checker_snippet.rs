use std::sync::Mutex;
use monitor::{SystemMonitor, SystemMetrics};
use config::AgentConfig;
use registration::RegistrationManager;
use heartbeat::HeartbeatManager;
use updater::AutoUpdater;

/// Start update checker loop in background (check every 24 hours)
fn start_update_checker(config: AgentConfig) {
    tokio::spawn(async move {
        let updater = AutoUpdater::new(config.server.api_url.clone());
        let check_interval = std::time::Duration::from_secs(config.updates.check_interval);

        loop {
            // Wait for check interval
            tokio::time::sleep(check_interval).await;

            if !config.updates.enabled {
                log::debug!("Auto-updates disabled, skipping check");
                continue;
            }

            log::info!("Checking for updates...");

            match updater.check_and_install(&config.agent.version).await {
                Ok(true) => {
                    log::info!("Update installed successfully, restarting...");
                    // The installer should restart the agent
                    std::process::exit(0);
                }
                Ok(false) => {
                    log::info!("No update installed");
                }
                Err(e) => {
                    log::error!("Update check/install failed: {}", e);
                }
            }
        }
    });
}
