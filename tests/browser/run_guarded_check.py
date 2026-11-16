"""Run finite local UI checks through the installed, verified browser guard."""
import argparse
from pathlib import Path
import sys


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--owner", required=True)
    parser.add_argument("--harness", type=Path, required=True)
    parser.add_argument("--code-file", type=Path, required=True)
    args = parser.parse_args()
    sys.path.insert(0, str(args.harness.resolve().parent))
    from browser_guard import GuardedSession

    session = None
    code = 1
    try:
        with GuardedSession(owner=args.owner, task="board-responsive-sort-detail-qa",
                            timeout=240) as session:
            result = session.run("run-code", args.code_file.read_text(),
                                 timeout=230, check=False)
            print(result.stdout, end="")
            print(result.stderr, end="", file=sys.stderr)
            code = result.returncode
    finally:
        if session is not None and session.status().get("state") == "clean":
            print("Browser cleanup verified: " + str(session.folder / "status.json"),
                  file=sys.stderr)
    return code


if __name__ == "__main__":
    raise SystemExit(main())
