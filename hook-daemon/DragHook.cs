using System;
using System.IO;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Diagnostics;
using System.Net.WebSockets;
using System.Runtime.InteropServices;
using System.Collections.Generic;

namespace ActionWheelHook {
    class Program {
        private const int WH_KEYBOARD_LL = 13;
        private const int WM_KEYDOWN = 0x0100;
        private const int WM_SYSKEYDOWN = 0x0104;
        private const int VK_TAB = 0x09;
        private const int VK_LBUTTON = 0x01;

        private static LowLevelKeyboardProc _proc = HookCallback;
        private static IntPtr _hookID = IntPtr.Zero;
        private static ClientWebSocket _ws = null;
        private static readonly Uri _serverUri = new Uri("ws://127.0.0.1:39217");
        private static readonly HashSet<string> _imageExts = new HashSet<string>(StringComparer.OrdinalIgnoreCase) {
            ".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tiff", ".avif", ".svg", ".ico"
        };

        [StructLayout(LayoutKind.Sequential)]
        public struct POINT {
            public int X;
            public int Y;
        }

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelKeyboardProc lpfn, IntPtr hMod, uint dwThreadId);

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool UnhookWindowsHookEx(IntPtr hhk);

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

        [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern IntPtr GetModuleHandle(string lpModuleName);

        [DllImport("user32.dll")]
        private static extern short GetAsyncKeyState(int vKey);

        [DllImport("user32.dll")]
        private static extern bool GetCursorPos(out POINT lpPoint);

        [DllImport("user32.dll")]
        private static extern IntPtr GetForegroundWindow();

        private delegate IntPtr LowLevelKeyboardProc(int nCode, IntPtr wParam, IntPtr lParam);

        static void Main(string[] args) {
            Console.WriteLine("[DragHook] Starting Global Drag + Tab Daemon...");
            
            // Start background WebSocket connection loop
            Task.Run(() => MaintainWebSocketConnection());

            _hookID = SetHook(_proc);
            Console.WriteLine("[DragHook] Global keyboard hook installed. Listening for Tab while dragging...");

            // Message pump
            MSG msg;
            while (GetMessage(out msg, IntPtr.Zero, 0, 0) > 0) {
                TranslateMessage(ref msg);
                DispatchMessage(ref msg);
            }

            UnhookWindowsHookEx(_hookID);
        }

        private static async Task MaintainWebSocketConnection() {
            while (true) {
                try {
                    if (_ws == null || _ws.State != WebSocketState.Open) {
                        _ws = new ClientWebSocket();
                        using (var cts = new CancellationTokenSource(TimeSpan.FromSeconds(3))) {
                            await _ws.ConnectAsync(_serverUri, cts.Token);
                            Console.WriteLine("[DragHook] Connected to Electron WebSocket server at " + _serverUri);
                        }
                    }
                } catch {
                    // Electron might not be running yet, retry in 2s
                }
                await Task.Delay(2000);
            }
        }

        private static IntPtr SetHook(LowLevelKeyboardProc proc) {
            using (Process curProcess = Process.GetCurrentProcess())
            using (ProcessModule curModule = curProcess.MainModule) {
                return SetWindowsHookEx(WH_KEYBOARD_LL, proc, GetModuleHandle(curModule.ModuleName), 0);
            }
        }

        private static IntPtr HookCallback(int nCode, IntPtr wParam, IntPtr lParam) {
            if (nCode >= 0 && (wParam == (IntPtr)WM_KEYDOWN || wParam == (IntPtr)WM_SYSKEYDOWN)) {
                int vkCode = Marshal.ReadInt32(lParam);
                if (vkCode == VK_TAB) {
                    bool isLeftMouseDown = (GetAsyncKeyState(VK_LBUTTON) & 0x8000) != 0;
                    if (isLeftMouseDown) {
                        POINT pt;
                        GetCursorPos(out pt);
                        Console.WriteLine("[DragHook] Tab detected while Left Mouse Button is down! Drag in progress at (" + pt.X + ", " + pt.Y + ")");

                        // Resolve dragged file in background
                        Task.Run(() => OnDragTabTriggered(pt.X, pt.Y));
                    }
                }
            }
            return CallNextHookEx(_hookID, nCode, wParam, lParam);
        }

        private static void OnDragTabTriggered(int cursorX, int cursorY) {
            string filePath = ResolveDraggedFile();
            if (string.IsNullOrEmpty(filePath)) {
                // Look for sample image fallback
                string sample = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "resources", "sample.jpg");
                if (File.Exists(sample)) filePath = Path.GetFullPath(sample);
            }

            if (!string.IsNullOrEmpty(filePath)) {
                Console.WriteLine("[DragHook] Sending DRAG_TAB for: " + filePath);
                SendTrigger(filePath, cursorX, cursorY);
            }
        }

        private static string ResolveDraggedFile() {
            try {
                // Query Shell.Application for active explorer selected items
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
                                            if (_imageExts.Contains(ext)) {
                                                return path;
                                            }
                                        }
                                    }
                                }
                            }
                        } catch { }
                    }
                }
            } catch (Exception ex) {
                Console.WriteLine("[DragHook] COM query error: " + ex.Message);
            }
            return null;
        }

        private static async void SendTrigger(string filePath, int x, int y) {
            try {
                if (_ws != null && _ws.State == WebSocketState.Open) {
                    // Escape json path
                    string cleanPath = filePath.Replace("\\", "\\\\").Replace("\"", "\\\"");
                    string json = string.Format("{{\"type\":\"DRAG_TAB\",\"filePath\":\"{0}\",\"cursorX\":{1},\"cursorY\":{2}}}", cleanPath, x, y);
                    byte[] bytes = Encoding.UTF8.GetBytes(json);
                    await _ws.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, CancellationToken.None);
                }
            } catch (Exception ex) {
                Console.WriteLine("[DragHook] Failed to send WS message: " + ex.Message);
            }
        }

        [StructLayout(LayoutKind.Sequential)]
        public struct MSG {
            public IntPtr hwnd;
            public uint message;
            public IntPtr wParam;
            public IntPtr lParam;
            public uint time;
            public POINT pt;
        }

        [DllImport("user32.dll")]
        public static extern sbyte GetMessage(out MSG lpMsg, IntPtr hWnd, uint wMsgFilterMin, uint wMsgFilterMax);

        [DllImport("user32.dll")]
        public static extern bool TranslateMessage([In] ref MSG lpMsg);

        [DllImport("user32.dll")]
        public static extern IntPtr DispatchMessage([In] ref MSG lpMsg);
    }
}
