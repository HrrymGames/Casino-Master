import UIKit
import WebKit

/// Hosts the HTML/JS game in a full-screen WKWebView.
/// The web layer talks to native code through `window.webkit.messageHandlers.casino`:
///   { type: "save",   data: "<json>" }  -> persisted to Application Support
///   { type: "haptic", style: "light" | "medium" | "heavy" | "success" }
final class GameViewController: UIViewController, WKScriptMessageHandler, WKNavigationDelegate {
    static let background = UIColor(red: 0.03, green: 0.06, blue: 0.04, alpha: 1)

    private var webView: WKWebView!
    private let store = SaveStore()

    override func loadView() {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        let controller = WKUserContentController()
        controller.add(WeakMessageHandler(self), name: "casino")
        config.userContentController = controller

        let wv = WKWebView(frame: .zero, configuration: config)
        wv.isOpaque = false
        wv.backgroundColor = Self.background
        wv.scrollView.backgroundColor = Self.background
        wv.scrollView.isScrollEnabled = false
        wv.scrollView.bounces = false
        wv.scrollView.contentInsetAdjustmentBehavior = .never
        wv.allowsBackForwardNavigationGestures = false
        wv.allowsLinkPreview = false
        wv.navigationDelegate = self
        if #available(iOS 16.4, *) { wv.isInspectable = true }
        webView = wv
        view = wv
        injectSave()
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        guard let index = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "web") else {
            return
        }
        webView.loadFileURL(index, allowingReadAccessTo: index.deletingLastPathComponent())
    }

    /// Makes the last saved game available to JavaScript before the page runs.
    private func injectSave() {
        let controller = webView.configuration.userContentController
        controller.removeAllUserScripts()
        let source = "window.__NATIVE_SAVE__ = \(Self.jsStringLiteral(store.load()));"
        controller.addUserScript(WKUserScript(source: source, injectionTime: .atDocumentStart, forMainFrameOnly: true))
    }

    static func jsStringLiteral(_ value: String?) -> String {
        guard let value = value,
              let data = try? JSONSerialization.data(withJSONObject: [value]),
              let array = String(data: data, encoding: .utf8),
              array.count >= 2 else { return "null" }
        return String(array.dropFirst().dropLast())
    }

    // MARK: - Appearance & rotation

    override var prefersStatusBarHidden: Bool { true }
    override var prefersHomeIndicatorAutoHidden: Bool { true }
    override var preferredScreenEdgesDeferringSystemGestures: UIRectEdge { .bottom }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask {
        UIDevice.current.userInterfaceIdiom == .pad ? .all : .allButUpsideDown
    }

    // MARK: - WKScriptMessageHandler

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let type = body["type"] as? String else { return }
        switch type {
        case "save":
            if let data = body["data"] as? String { store.save(data) }
        case "haptic":
            Haptics.play(body["style"] as? String ?? "light")
        default:
            break
        }
    }

    // MARK: - WKNavigationDelegate

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        webView.scrollView.pinchGestureRecognizer?.isEnabled = false
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        injectSave()
        webView.reload()
    }
}

/// Avoids a retain cycle between WKUserContentController and the view controller.
final class WeakMessageHandler: NSObject, WKScriptMessageHandler {
    weak var target: WKScriptMessageHandler?
    init(_ target: WKScriptMessageHandler) { self.target = target }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        target?.userContentController(userContentController, didReceive: message)
    }
}

/// Stores the save-game JSON in Application Support so it survives app updates/re-signing.
final class SaveStore {
    private let url: URL = {
        let dir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent("casino-master-save.json")
    }()

    func load() -> String? {
        try? String(contentsOf: url, encoding: .utf8)
    }

    func save(_ json: String) {
        try? json.write(to: url, atomically: true, encoding: .utf8)
    }
}

enum Haptics {
    static func play(_ style: String) {
        switch style {
        case "success":
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        case "heavy":
            UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
        case "medium":
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        default:
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
        }
    }
}
