using System;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace ObsidianLocalAI
{
    internal static class Program
    {
        [DllImport("dwmapi.dll")]
        private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int attrValue, int attrSize);

        private const int DWMWA_USE_IMMERSIVE_DARK_MODE = 20;

        [STAThread]
        private static void Main()
        {
            ApplicationConfiguration.Initialize();
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            try
            {
                Application.Run(new MainWindow());
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    $"Error starting Obsidian Local AI:\n{ex.Message}\n\nMake sure Microsoft Edge WebView2 runtime is available on this system.",
                    "Obsidian Local AI",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );
            }
        }

        public class MainWindow : Form
        {
            private WebView2 _webView = null!;
            private string _assetDirectory = "";

            public MainWindow()
            {
                Text = "Obsidian Local AI - Local Intelligence Workspace";
                Size = new Size(1400, 900);
                MinimumSize = new Size(960, 600);
                StartPosition = FormStartPosition.CenterScreen;
                BackColor = Color.FromArgb(18, 18, 20);

                // Set application icon from embedded PNG at runtime without resource compiler
                try
                {
                    var assembly = Assembly.GetExecutingAssembly();
                    using var iconStream = assembly.GetManifestResourceStream("ObsidianLocalAI.app_icon.png");
                    if (iconStream != null)
                    {
                        using var bmp = new Bitmap(iconStream);
                        var hIcon = bmp.GetHicon();
                        Icon = Icon.FromHandle(hIcon);
                    }
                }
                catch
                {
                    // Fallback to default
                }

                // Enable Windows 10/11 Dark Titlebar
                try
                {
                    int darkMode = 1;
                    DwmSetWindowAttribute(Handle, DWMWA_USE_IMMERSIVE_DARK_MODE, ref darkMode, sizeof(int));
                }
                catch
                {
                    // Ignore on older Windows versions
                }

                InitializeLayout();
            }

            private void InitializeLayout()
            {
                _webView = new WebView2
                {
                    Dock = DockStyle.Fill,
                    DefaultBackgroundColor = Color.FromArgb(18, 18, 20)
                };

                Controls.Add(_webView);

                Shown += async (s, e) => await InitializeWebViewAsync();
            }

            private async Task InitializeWebViewAsync()
            {
                try
                {
                    _assetDirectory = PrepareAssets();

                    var userDataFolder = Path.Combine(
                        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                        "ObsidianLocalAI",
                        "WebView2Data"
                    );
                    Directory.CreateDirectory(userDataFolder);

                    var envOptions = new CoreWebView2EnvironmentOptions(
                        "--enable-features=WebGPU,SharedArrayBuffer --allow-running-insecure-content"
                    );

                    var env = await CoreWebView2Environment.CreateAsync(null, userDataFolder, envOptions);
                    await _webView.EnsureCoreWebView2Async(env);

                    // Map local dist folder to https://app.local
                    _webView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                        "app.local",
                        _assetDirectory,
                        CoreWebView2HostResourceAccessKind.Allow
                    );

                    _webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
                    _webView.CoreWebView2.Settings.AreDevToolsEnabled = true;
                    _webView.CoreWebView2.Settings.IsSwipeNavigationEnabled = false;

                    _webView.CoreWebView2.Navigate("https://app.local/index.html");
                }
                catch (Exception ex)
                {
                    MessageBox.Show(
                        $"Failed to initialize WebView2:\n\n{ex.Message}",
                        "Obsidian Local AI",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error
                    );
                }
            }

            private string PrepareAssets()
            {
                // 1. Check if relative ../dist or ./dist folder exists (dev / local build)
                var localDist = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "dist");
                if (Directory.Exists(localDist) && File.Exists(Path.Combine(localDist, "index.html")))
                {
                    return localDist;
                }

                var parentDist = Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "dist"));
                if (Directory.Exists(parentDist) && File.Exists(Path.Combine(parentDist, "index.html")))
                {
                    return parentDist;
                }

                // 2. Extract embedded app_dist.zip archive to LocalApplicationData
                var targetDir = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "ObsidianLocalAI",
                    "app_assets_v1"
                );

                var assembly = Assembly.GetExecutingAssembly();
                using var zipStream = assembly.GetManifestResourceStream("ObsidianLocalAI.app_dist.zip");
                
                if (zipStream != null)
                {
                    // Check if already extracted or needs extraction
                    var indexFile = Path.Combine(targetDir, "index.html");
                    if (!File.Exists(indexFile))
                    {
                        Directory.CreateDirectory(targetDir);
                        using var archive = new ZipArchive(zipStream, ZipArchiveMode.Read);
                        archive.ExtractToDirectory(targetDir, overwriteFiles: true);
                    }
                }

                return targetDir;
            }
        }
    }
}
