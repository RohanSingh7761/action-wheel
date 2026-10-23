param(
    [int]$Port = 39217
)

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
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern IntPtr GetShellWindow();
    [DllImport("user32.dll")] public static extern IntPtr WindowFromPoint(POINT Point);
    [DllImport("user32.dll")] public static extern IntPtr GetAncestor(IntPtr hwnd, uint gaFlags);
    [DllImport("user32.dll")] public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

    private const uint GA_ROOT = 2;

    [StructLayout(LayoutKind.Sequential)]
    public struct POINT { public int X; public int Y; }

    // Accepted photo formats only (NO videos, NO audio, NO archives, NO docs)
    private static readonly HashSet<string> _photoExts = new HashSet<string>(StringComparer.OrdinalIgnoreCase) {
        ".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff", ".tif", ".avif", ".heic", ".heif", ".gif"
    };

    // Video formats explicitly checked to reject immediately
    private static readonly HashSet<string> _videoExts = new HashSet<string>(StringComparer.OrdinalIgnoreCase) {
        ".mp4", ".mkv", ".mov", ".avi", ".wmv", ".webm", ".flv", ".m4v", ".mpg", ".mpeg", ".3gp", ".ts", ".mts"
    };

    private static ClientWebSocket _ws = null;
    private static int _serverPort = 39217;
    private static Uri _serverUri {
        get { return new Uri("ws://127.0.0.1:" + _serverPort); }
    }
    private static volatile bool _isWheelActive = false;

    public static void Run(int port) {
        if (port > 1024 && port < 65535) {
            _serverPort = port;
        }
        Console.WriteLine("[listener] In-memory Drag + Tab listener started.");

        Thread connThread = new Thread(ConnectionLoop);
        connThread.IsBackground = true;
        connThread.Start();

        Thread recvThread = new Thread(ReceiveLoop);
        recvThread.IsBackground = true;
        recvThread.Start();

        // Main polling loop
        while (true) {
            // Check if Left Mouse Button is down (dragging)
            short lBtn = GetAsyncKeyState(0x01); // VK_LBUTTON
            bool isLeftMouseDown = (lBtn & 0x8000) != 0;

            // Check dismissal if wheel is active
            if (_isWheelActive) {
                short esc = GetAsyncKeyState(0x1B); // VK_ESCAPE
                short tabDismiss = GetAsyncKeyState(0x09); // VK_TAB
                short altDismiss = GetAsyncKeyState(0x12); // VK_MENU
                // If Esc is pressed, or Tab without Alt is pressed -> dismiss
                if (((esc & 0x8000) != 0) || (((tabDismiss & 0x8000) != 0) && ((altDismiss & 0x8000) == 0))) {
                    Console.WriteLine("[listener] Dismiss hotkey detected");
                    SendDismiss();
                    _isWheelActive = false;
                    while (((GetAsyncKeyState(0x1B) & 0x8000) != 0) || ((GetAsyncKeyState(0x09) & 0x8000) != 0)) {
                        Thread.Sleep(20);
                    }
                }
            }

            // ONLY when dragging (Left Mouse Button MUST be pressed down) and wheel is NOT already active:
            if (isLeftMouseDown && !_isWheelActive) {
                // Modifier keys MUST NOT be down (Alt, Ctrl, Win)
                // This guarantees Alt+Tab, Ctrl+Tab, Win+Tab are 100% ignored
                short altKey = GetAsyncKeyState(0x12); // VK_MENU
                short ctrlKey = GetAsyncKeyState(0x11); // VK_CONTROL
                short winKey1 = GetAsyncKeyState(0x5B); // VK_LWIN
                short winKey2 = GetAsyncKeyState(0x5C); // VK_RWIN
                bool hasModifier = ((altKey & 0x8000) != 0) ||
                                   ((ctrlKey & 0x8000) != 0) ||
                                   ((winKey1 & 0x8000) != 0) ||
                                   ((winKey2 & 0x8000) != 0);

                if (!hasModifier) {
                    short tab = GetAsyncKeyState(0x09); // VK_TAB
                    bool isTabDown = ((tab & 0x8000) != 0) || ((tab & 0x01) != 0);

                    if (isTabDown) {
                        POINT pt;
                        GetCursorPos(out pt);
                        Console.WriteLine("[listener] Drag + Tab detected at (" + pt.X + ", " + pt.Y + ")");

                        List<string> photoPaths = GetDraggedPhotoPaths(pt);

                        if (photoPaths != null && photoPaths.Count > 0) {
                            Console.WriteLine("[listener] Triggering wheel for " + photoPaths.Count + " photo(s): " + photoPaths[0]);
                            SendTrigger(photoPaths, pt.X, pt.Y);
                            _isWheelActive = true;
                        } else {
                            Console.WriteLine("[listener] Drag + Tab ignored: selection does not consist exclusively of images.");
                        }

                        // Wait until Tab key is released so we don't immediately re-trigger
                        while ((GetAsyncKeyState(0x09) & 0x8000) != 0) {
                            Thread.Sleep(15);
                        }
                    }
                }
            }

            Thread.Sleep(10);
        }
    }

    private static void ConnectionLoop() {
        while (true) {
            try {
                if (_ws == null || _ws.State != WebSocketState.Open) {
                    _ws = new ClientWebSocket();
                    using (var cts = new CancellationTokenSource(TimeSpan.FromSeconds(3))) {
                        _ws.ConnectAsync(_serverUri, cts.Token).Wait();
                        Console.WriteLine("[listener] Connected to Action Wheel at " + _serverUri);
                    }
                }
            } catch { }
            Thread.Sleep(1500);
        }
    }

    private static void ReceiveLoop() {
        var buffer = new byte[1024];
        while (true) {
            try {
                if (_ws != null && _ws.State == WebSocketState.Open) {
                    var seg = new ArraySegment<byte>(buffer);
                    var task = _ws.ReceiveAsync(seg, CancellationToken.None);
                    task.Wait();
                    var result = task.Result;
                    if (result.MessageType == WebSocketMessageType.Close) {
                        Thread.Sleep(500);
                        continue;
                    }
                    string msg = Encoding.UTF8.GetString(buffer, 0, result.Count);
                    if (msg.IndexOf("WHEEL_CLOSED", StringComparison.OrdinalIgnoreCase) >= 0) {
                        _isWheelActive = false;
                    } else if (msg.IndexOf("WHEEL_OPENED", StringComparison.OrdinalIgnoreCase) >= 0) {
                        _isWheelActive = true;
                    }
                } else {
                    Thread.Sleep(500);
                }
            } catch {
                Thread.Sleep(1000);
            }
        }
    }

    private static void SendTrigger(List<string> filePaths, int x, int y) {
        try {
            if (_ws != null && _ws.State == WebSocketState.Open && filePaths != null && filePaths.Count > 0) {
                string primaryPath = filePaths[0].Replace("\\", "\\\\").Replace("\"", "\\\"");
                StringBuilder sb = new StringBuilder();
                sb.Append("[");
                for (int i = 0; i < filePaths.Count; i++) {
                    if (i > 0) sb.Append(",");
                    sb.Append("\"").Append(filePaths[i].Replace("\\", "\\\\").Replace("\"", "\\\"")).Append("\"");
                }
                sb.Append("]");
                string json = string.Format("{{\"type\":\"DRAG_TAB\",\"filePath\":\"{0}\",\"filePaths\":{1},\"cursorX\":{2},\"cursorY\":{3}}}", primaryPath, sb.ToString(), x, y);
                byte[] bytes = Encoding.UTF8.GetBytes(json);
                _ws.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, CancellationToken.None).Wait();
            }
        } catch (Exception ex) {
            Console.WriteLine("[listener] Send error: " + ex.Message);
        }
    }

    private static void SendDismiss() {
        try {
            if (_ws != null && _ws.State == WebSocketState.Open) {
                string json = "{\"type\":\"DISMISS\"}";
                byte[] bytes = Encoding.UTF8.GetBytes(json);
                _ws.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, CancellationToken.None).Wait();
            }
        } catch { }
    }

    private static bool IsDesktopWindow(IntPtr hwnd) {
        if (hwnd == IntPtr.Zero) return false;
        if (hwnd == GetShellWindow()) return true;
        StringBuilder sb = new StringBuilder(64);
        GetClassName(hwnd, sb, 64);
        string cls = sb.ToString();
        return cls == "Progman" || cls == "WorkerW";
    }

    private static List<string> GetDraggedPhotoPaths(POINT pt) {
        try {
            Type shellType = Type.GetTypeFromProgID("Shell.Application");
            if (shellType == null) return null;
            dynamic shell = Activator.CreateInstance(shellType);
            var windows = shell.Windows();

            IntPtr fgHwnd = GetForegroundWindow();
            IntPtr ptRoot = GetAncestor(WindowFromPoint(pt), GA_ROOT);

            // 1. Check if foreground window or window under cursor is an active Explorer window
            foreach (var w in windows) {
                try {
                    long wHwnd = (long)w.HWND;
                    if (wHwnd == (long)fgHwnd || wHwnd == (long)ptRoot) {
                        return ExtractPhotosFromDoc(w.Document);
                    }
                } catch { }
            }

            // 2. Check if drag is on the Desktop (foreground or under cursor is Desktop)
            if (IsDesktopWindow(fgHwnd) || IsDesktopWindow(ptRoot)) {
                try {
                    const int SWC_DESKTOP = 8;
                    const int SWFO_NEEDDISPATCH = 1;
                    int hwnd = 0;
                    object disp = windows.FindWindowSW(Type.Missing, Type.Missing, SWC_DESKTOP, ref hwnd, SWFO_NEEDDISPATCH);
                    if (disp != null) {
                        dynamic desktopWin = disp;
                        return ExtractPhotosFromDoc(desktopWin.Document);
                    }
                } catch { }
            }
        } catch { }

        return null;
    }

    private static List<string> ExtractPhotosFromDoc(dynamic doc) {
        if (doc == null) return null;

        // Check selected items (all items actively being dragged)
        try {
            var selected = doc.SelectedItems();
            if (selected != null && selected.Count > 0) {
                List<string> list = new List<string>();
                foreach (var item in selected) {
                    string path = (string)item.Path;
                    if (string.IsNullOrEmpty(path)) return null;
                    string ext = Path.GetExtension(path);
                    if (_videoExts.Contains(ext)) {
                        Console.WriteLine("[listener] Item is a video (" + ext + "), rejecting selection: " + path);
                        return null;
                    }
                    if (!_photoExts.Contains(ext) || !File.Exists(path)) {
                        Console.WriteLine("[listener] Item is not an image (" + ext + "), rejecting selection: " + path);
                        return null;
                    }
                    list.Add(path);
                }
                if (list.Count > 0) return list;
                return null;
            }
        } catch { }

        // Fallback to focused item only if SelectedItems was inaccessible
        try {
            var focused = doc.FocusedItem;
            if (focused != null) {
                string path = (string)focused.Path;
                if (!string.IsNullOrEmpty(path)) {
                    string ext = Path.GetExtension(path);
                    if (!_videoExts.Contains(ext) && _photoExts.Contains(ext) && File.Exists(path)) {
                        return new List<string> { path };
                    }
                }
            }
        } catch { }

        return null;
    }
}
"@ -ReferencedAssemblies System.Core, Microsoft.CSharp

[DragListener]::Run($Port)
