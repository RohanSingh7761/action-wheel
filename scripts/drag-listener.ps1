Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Net.WebSockets;
using System.Runtime.InteropServices;
using System.Collections.Generic;

public class DragListener {
    [DllImport("user32.dll")] public static extern short GetAsyncKeyState(int vKey);
    [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT lpPoint);

    [StructLayout(LayoutKind.Sequential)]
    public struct POINT { public int X; public int Y; }

    private static readonly HashSet<string> _imageExts = new HashSet<string>(StringComparer.OrdinalIgnoreCase) {
        ".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tiff", ".avif", ".svg", ".ico"
    };

    private static ClientWebSocket _ws = null;
    private static readonly Uri _serverUri = new Uri("ws://127.0.0.1:39217");
    private static string _fallbackPath = "";

    public static void Run(string fallbackPath) {
        _fallbackPath = fallbackPath;
        Console.WriteLine("[listener] In-memory Drag + Tab listener started.");

        // WebSocket connection manager
        Task.Run(async () => {
            while (true) {
                try {
                    if (_ws == null || _ws.State != WebSocketState.Open) {
                        _ws = new ClientWebSocket();
                        using (var cts = new CancellationTokenSource(TimeSpan.FromSeconds(3))) {
                            await _ws.ConnectAsync(_serverUri, cts.Token);
                            Console.WriteLine("[listener] Connected to Action Wheel at " + _serverUri);
                        }
                    }
                } catch { }
                await Task.Delay(1500);
            }
        });

        // Polling loop for Drag (Left Click) + Tab
        while (true) {
            short lBtn = GetAsyncKeyState(0x01); // VK_LBUTTON
            bool isMouseDown = (lBtn & 0x8000) != 0;

            if (isMouseDown) {
                short tab = GetAsyncKeyState(0x09); // VK_TAB
                bool isTabDown = (tab & 0x8000) != 0;

                if (isTabDown) {
                    POINT pt;
                    GetCursorPos(out pt);
                    Console.WriteLine("[listener] Drag + Tab detected at (" + pt.X + ", " + pt.Y + ")");

                    string filePath = GetSelectedImagePath();
                    if (string.IsNullOrEmpty(filePath) || !File.Exists(filePath)) {
                        filePath = _fallbackPath;
                    }

                    if (!string.IsNullOrEmpty(filePath) && File.Exists(filePath)) {
                        Console.WriteLine("[listener] Triggering wheel for: " + filePath);
                        SendTrigger(filePath, pt.X, pt.Y);
                    }

                    // Wait until the current drag gesture finishes (Left Mouse Button is released)
                    while ((GetAsyncKeyState(0x01) & 0x8000) != 0) {
                        Thread.Sleep(15);
                    }
                } else {
                    Thread.Sleep(5);
                }
            } else {
                Thread.Sleep(15);
            }
        }
    }

    private static async void SendTrigger(string filePath, int x, int y) {
        try {
            if (_ws != null && _ws.State == WebSocketState.Open) {
                string cleanPath = filePath.Replace("\\", "\\\\").Replace("\"", "\\\"");
                string json = string.Format("{{\"type\":\"DRAG_TAB\",\"filePath\":\"{0}\",\"cursorX\":{1},\"cursorY\":{2}}}", cleanPath, x, y);
                byte[] bytes = Encoding.UTF8.GetBytes(json);
                await _ws.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, CancellationToken.None);
            }
        } catch (Exception ex) {
            Console.WriteLine("[listener] Send error: " + ex.Message);
        }
    }

    public static string GetSelectedImagePath() {
        try {
            Type shellType = Type.GetTypeFromProgID("Shell.Application");
            if (shellType != null) {
                dynamic shell = Activator.CreateInstance(shellType);
                var windows = shell.Windows();
                foreach (var w in windows) {
                    try {
                        var doc = w.Document;
                        if (doc != null) {
                            var selected = doc.SelectedItems();
                            if (selected != null && selected.Count > 0) {
                                foreach (var item in selected) {
                                    string path = item.Path;
                                    if (!string.IsNullOrEmpty(path) && File.Exists(path)) {
                                        string ext = Path.GetExtension(path);
                                        if (_imageExts.Contains(ext)) return path;
                                    }
                                }
                            }
                        }
                    } catch { }
                }

                // Check Desktop
                try {
                    const int SWC_DESKTOP = 8;
                    const int SWFO_NEEDDISPATCH = 1;
                    int hwnd = 0;
                    object disp = windows.FindWindowSW(Type.Missing, Type.Missing, SWC_DESKTOP, ref hwnd, SWFO_NEEDDISPATCH);
                    if (disp != null) {
                        dynamic desktopWin = disp;
                        var doc = desktopWin.Document;
                        if (doc != null) {
                            var selected = doc.SelectedItems();
                            if (selected != null && selected.Count > 0) {
                                foreach (var item in selected) {
                                    string path = item.Path;
                                    if (!string.IsNullOrEmpty(path) && File.Exists(path)) {
                                        string ext = Path.GetExtension(path);
                                        if (_imageExts.Contains(ext)) return path;
                                    }
                                }
                            }
                        }
                    }
                } catch { }
            }
        } catch { }
        return null;
    }
}
"@ -ReferencedAssemblies System.Core, Microsoft.CSharp

$sample = Join-Path $PSScriptRoot "..\resources\sample.jpg"
if (Test-Path $sample) {
    $sample = (Resolve-Path $sample).Path
}

[DragListener]::Run($sample)
