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
    private static volatile bool _isWheelActive = false;

    public static void Run() {
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
                            Task.Run(ReceiveLoop);
                        }
                    }
                } catch { }
                await Task.Delay(1500);
            }
        });

        // Polling loop for Drag (Left Click) + Tab and hotkey dismissals
        while (true) {
            short lBtn = GetAsyncKeyState(0x01); // VK_LBUTTON
            bool isMouseDown = (lBtn & 0x8000) != 0;

            if (_isWheelActive) {
                // Wheel is active: check if Esc or Tab is pressed to dismiss
                short esc = GetAsyncKeyState(0x1B); // VK_ESCAPE
                short tab = GetAsyncKeyState(0x09); // VK_TAB
                if ((esc & 0x8000) != 0 || (tab & 0x8000) != 0) {
                    Console.WriteLine("[listener] Dismiss hotkey (Esc/Tab) detected");
                    SendDismiss();
                    _isWheelActive = false;
                    while (((GetAsyncKeyState(0x1B) & 0x8000) != 0) || ((GetAsyncKeyState(0x09) & 0x8000) != 0)) {
                        Thread.Sleep(20);
                    }
                }
            }

            if (isMouseDown && !_isWheelActive) {
                short tab = GetAsyncKeyState(0x09); // VK_TAB
                bool isTabDown = (tab & 0x8000) != 0;

                if (isTabDown) {
                    POINT pt;
                    GetCursorPos(out pt);
                    Console.WriteLine("[listener] Drag + Tab detected at (" + pt.X + ", " + pt.Y + ")");

                    string filePath = GetSelectedImagePath();

                    if (!string.IsNullOrEmpty(filePath) && File.Exists(filePath)) {
                        Console.WriteLine("[listener] Triggering wheel for: " + filePath);
                        SendTrigger(filePath, pt.X, pt.Y);
                        _isWheelActive = true;
                    } else {
                        Console.WriteLine("[listener] Drag + Tab detected, but no image item was focused/selected.");
                    }

                    // Wait until Tab key is released so we don't immediately trigger dismiss
                    while ((GetAsyncKeyState(0x09) & 0x8000) != 0) {
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

    private static async Task ReceiveLoop() {
        var buffer = new byte[1024];
        while (true) {
            try {
                if (_ws != null && _ws.State == WebSocketState.Open) {
                    var result = await _ws.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
                    if (result.MessageType == WebSocketMessageType.Close) break;
                    string msg = Encoding.UTF8.GetString(buffer, 0, result.Count);
                    if (msg.Contains("WHEEL_CLOSED")) {
                        _isWheelActive = false;
                    } else if (msg.Contains("WHEEL_OPENED")) {
                        _isWheelActive = true;
                    }
                } else {
                    await Task.Delay(500);
                }
            } catch {
                await Task.Delay(1000);
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

    private static async void SendDismiss() {
        try {
            if (_ws != null && _ws.State == WebSocketState.Open) {
                string json = "{\"type\":\"DISMISS\"}";
                byte[] bytes = Encoding.UTF8.GetBytes(json);
                await _ws.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, CancellationToken.None);
            }
        } catch { }
    }

    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();

    public static string GetSelectedImagePath() {
        try {
            Type shellType = Type.GetTypeFromProgID("Shell.Application");
            if (shellType == null) return null;
            dynamic shell = Activator.CreateInstance(shellType);
            var windows = shell.Windows();
            IntPtr fgHwnd = GetForegroundWindow();

            // 1. Check if foreground window is an Explorer window
            foreach (var w in windows) {
                try {
                    if ((long)w.HWND == (long)fgHwnd) {
                        string p = ExtractImageFromDoc(w.Document);
                        if (!string.IsNullOrEmpty(p)) return p;
                    }
                } catch { }
            }

            // 2. Check Desktop
            try {
                const int SWC_DESKTOP = 8;
                const int SWFO_NEEDDISPATCH = 1;
                int hwnd = 0;
                object disp = windows.FindWindowSW(Type.Missing, Type.Missing, SWC_DESKTOP, ref hwnd, SWFO_NEEDDISPATCH);
                if (disp != null) {
                    dynamic desktopWin = disp;
                    string p = ExtractImageFromDoc(desktopWin.Document);
                    if (!string.IsNullOrEmpty(p)) return p;
                }
            } catch { }

            // 3. Check any other Explorer windows
            foreach (var w in windows) {
                try {
                    string p = ExtractImageFromDoc(w.Document);
                    if (!string.IsNullOrEmpty(p)) return p;
                } catch { }
            }
        } catch { }
        return null;
    }

    private static string ExtractImageFromDoc(dynamic doc) {
        if (doc == null) return null;
        try {
            var focused = doc.FocusedItem;
            if (focused != null) {
                string path = (string)focused.Path;
                if (!string.IsNullOrEmpty(path) && File.Exists(path)) {
                    string ext = Path.GetExtension(path);
                    if (_imageExts.Contains(ext)) return path;
                }
            }
        } catch { }

        try {
            var selected = doc.SelectedItems();
            if (selected != null && selected.Count > 0) {
                foreach (var item in selected) {
                    string path = (string)item.Path;
                    if (!string.IsNullOrEmpty(path) && File.Exists(path)) {
                        string ext = Path.GetExtension(path);
                        if (_imageExts.Contains(ext)) return path;
                    }
                }
            }
        } catch { }
        return null;
    }
}
"@ -ReferencedAssemblies System.Core, Microsoft.CSharp

[DragListener]::Run()
