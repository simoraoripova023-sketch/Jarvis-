Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\777\OneDrive\Desktop\Jarvis"
WshShell.Run "node ""C:\Users\777\OneDrive\Desktop\Jarvis\desktop-bridge\server.cjs""", 0, False
