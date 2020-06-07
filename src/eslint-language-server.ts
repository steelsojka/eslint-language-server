import * as vs from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { CLIEngine, Linter } from "eslint";
import { URI } from "vscode-uri";

const connection = vs.createConnection(process.stdin, process.stdout);
const documents = new vs.TextDocuments(TextDocument);
let eslint: CLIEngine;
let linter: Linter;

// let hasDiagnosticsCapabilities = false;

connection.onInitialize(params => {
  // const { capabilities } = params;
  // hasDiagnosticsCapabilities =
  //   capabilities.textDocument?.publishDiagnostics?.relatedInformation ?? false;
  return {
    serverInfo: {
      name: "eslint-language-server"
    },
    capabilities: {
      textDocumentSync: vs.TextDocumentSyncKind.Full,
      codeActionProvider: {
        codeActionKinds: [
          vs.CodeActionKind.QuickFix,
          vs.CodeActionKind.SourceFixAll
        ]
      }
    }
  };
});

connection.onInitialized(() => {
  // TODO: Use installed eslint.
  eslint = new CLIEngine({});
  linter = new Linter();
});

documents.onDidChangeContent(change => lintDocument(change));
documents.listen(connection);
connection.listen();

function lintDocument(change: vs.TextDocumentChangeEvent<TextDocument>): void {
  const textDocument = change.document;
  const config = eslint.getConfigForFile(URI.parse(textDocument.uri).fsPath);
  const results = linter.verify(textDocument.getText(), config);

  connection.sendDiagnostics({
    uri: textDocument.uri,
    diagnostics: results.map(item => ({
      severity:
        item.severity === 0
          ? vs.DiagnosticSeverity.Information
          : item.severity === 1
          ? vs.DiagnosticSeverity.Warning
          : item.severity === 2
          ? vs.DiagnosticSeverity.Error
          : vs.DiagnosticSeverity.Hint,
      message: item.message,
      source: item.source ?? undefined,
      range: {
        start: {
          character: item.column,
          line: item.line
        },
        end: {
          character: item.endColumn ?? item.column,
          line: item.endLine ?? item.line
        }
      }
    }))
  });
}
