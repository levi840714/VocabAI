import os
import re
import sys
import json
import argparse


def norm_path(p: str) -> str:
    if not p:
        return '/'
    # ensure leading slash
    if not p.startswith('/'):
        p = '/' + p
    # collapse multiple slashes
    p = re.sub(r'/+', '/', p)
    # strip trailing slash except root
    if len(p) > 1 and p.endswith('/'):
        p = p[:-1]
    return p


def collect_fastapi_routes(ignore_methods=None, ignore_paths=None):
    ignore_methods = ignore_methods or {"HEAD", "OPTIONS"}
    ignore_paths = ignore_paths or []

    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    sys.path.insert(0, project_root)
    try:
        from fastapi.routing import APIRoute
        from api.main import app as fastapi_app
    except Exception as e:
        print(f"ERROR: Unable to import FastAPI app: {e}")
        print("Hint: ensure dependencies are installed (make setup) and PYTHONPATH includes project root.")
        raise

    routes = []
    for r in fastapi_app.routes:
        if isinstance(r, APIRoute):
            path = norm_path(r.path)
            if any(re.search(pat, path) for pat in ignore_paths):
                continue
            for m in (r.methods or set()):
                m = m.upper()
                if m in ignore_methods:
                    continue
                routes.append({
                    'method': m,
                    'path': path,
                    'name': r.name,
                    'endpoint': getattr(r.endpoint, '__name__', 'func')
                })
    return routes


def collect_aiohttp_routes(ignore_methods=None, ignore_paths=None):
    ignore_methods = ignore_methods or {"HEAD", "OPTIONS"}
    ignore_paths = ignore_paths or []

    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    sys.path.insert(0, project_root)
    import asyncio
    from aiohttp import web
    try:
        from main import setup_api_routes
    except Exception as e:
        print(f"ERROR: Unable to import aiohttp setup: {e}")
        raise

    async def _build():
        app = web.Application()
        await setup_api_routes(app)
        items = []
        for resource in app.router.resources():
            try:
                path = norm_path(resource.canonical)
            except Exception:
                continue
            if any(re.search(pat, path) for pat in ignore_paths):
                continue
            for route in resource:
                method = getattr(route, 'method', None)
                if method and method.upper() not in ignore_methods:
                    items.append({
                        'method': method.upper(),
                        'path': path,
                        'handler': getattr(route.handler, '__name__', 'handler')
                    })
        return items

    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(_build())
    finally:
        loop.close()


def compare(fapi_routes, aio_routes):
    fset = {(r['method'], r['path']) for r in fapi_routes}
    aset = {(r['method'], r['path']) for r in aio_routes}
    missing = sorted(fset - aset)
    extra = sorted(aset - fset)
    return missing, extra


def extract_path_params(path: str):
    return set(re.findall(r"\{([^}/]+)\}", path or ''))


def main():
    parser = argparse.ArgumentParser(description="Check FastAPI ↔ aiohttp bridge consistency")
    parser.add_argument('--json', action='store_true', help='Output JSON report')
    parser.add_argument('--ignore-path', action='append', default=[], help='Regex to ignore paths (can repeat)')
    parser.add_argument('--ignore-method', action='append', default=['HEAD', 'OPTIONS'], help='Methods to ignore')
    parser.add_argument('--show-extra', action='store_true', help='Show routes present only in aiohttp')
    args = parser.parse_args()

    ignore_methods = set(m.upper() for m in args.ignore_method)
    ignore_paths = args.ignore_path

    fapi = collect_fastapi_routes(ignore_methods=ignore_methods, ignore_paths=ignore_paths)
    aio = collect_aiohttp_routes(ignore_methods=ignore_methods, ignore_paths=ignore_paths)

    missing, extra = compare(fapi, aio)

    # Build JSON report data
    report = {
        'summary': {
            'fastapi_total': len(fapi),
            'aiohttp_total': len(aio),
            'missing_in_aiohttp': len(missing),
            'extra_in_aiohttp': len(extra)
        },
        'missing': [
            {
                'method': m,
                'path': p,
                'path_params': sorted(extract_path_params(p)),
                'hint': 'Route defined in FastAPI but not exposed via aiohttp. Ensure wrapper/auto-bridge registers it.'
            }
            for (m, p) in missing
        ],
        'extra': [
            {
                'method': m,
                'path': p,
                'hint': 'Present only in aiohttp. Verify parity or consider adding in FastAPI for single source of truth.'
            }
            for (m, p) in extra
        ]
    }

    if args.json:
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        if report['summary']['missing_in_aiohttp'] == 0 and (report['summary']['extra_in_aiohttp'] == 0 or not args.show_extra):
            print("✅ Bridge OK: FastAPI and aiohttp routes are in sync.")
        else:
            print("📊 Bridge Report")
            print(f"- FastAPI routes: {report['summary']['fastapi_total']}")
            print(f"- aiohttp routes: {report['summary']['aiohttp_total']}")
            print(f"- Missing in aiohttp: {report['summary']['missing_in_aiohttp']}")
            if report['missing']:
                print("\n❌ Missing (will cause 405 on Cloud Run):")
                for item in report['missing']:
                    pparams = (" [params: " + ", ".join(item['path_params']) + "]") if item['path_params'] else ""
                    print(f"  - {item['method']} {item['path']}{pparams}")
            if args.show_extra and report['extra']:
                print("\nℹ️  Extra in aiohttp (not in FastAPI):")
                for item in report['extra']:
                    print(f"  - {item['method']} {item['path']}")

    # return non-zero if missing (strict), zero otherwise
    return 1 if report['summary']['missing_in_aiohttp'] > 0 else 0


if __name__ == "__main__":
    raise SystemExit(main())
