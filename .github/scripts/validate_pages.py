"""Dependency-free, read-only pre-upload gate (Python 3.9+)."""
import argparse
from html.parser import HTMLParser
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit

FORBIDDEN = re.compile(
    r'file\s*://|(?<![\w])[A-Za-z]:[\\/]|\\\\[^\s\\]+\\'
    r'|(?<![\w])/(?:Users|home|Volumes|private|tmp|var|workspace|mnt|opt|Applications|Desktop|Documents)/'
    r'|(?<![\w])~[\\/]', re.IGNORECASE)
EXTERNAL = {'http', 'https', 'data', 'blob', 'mailto', 'tel', 'javascript'}


def validate(root, base_path='/Minamitane-life-demo/'):
    root = Path(root).resolve()
    errors = []
    entry = root / 'index.html'
    if not entry.is_file():
        errors.append('index.html: missing regular file')
    elif not entry.read_bytes().strip():
        errors.append('index.html: empty or whitespace only')
    if not base_path.startswith('/') or not base_path.endswith('/'):
        raise ValueError('base path must start and end with /')

    class Parser(HTMLParser):
        def __init__(self, source):
            super().__init__(convert_charrefs=True)
            self.source = source

        def handle_starttag(self, tag, attrs):
            line = self.getpos()[0]
            if tag == 'base':
                errors.append(f'{self.source}:{line}: unsupported <base>; review URL resolution')
            for attr, value in attrs:
                if attr not in ('src', 'href') or value is None:
                    continue
                value = value.strip()
                label = f'{self.source}:{line}: {attr}'
                if not value or value.startswith('#'):
                    continue
                decoded = unquote(value)
                if FORBIDDEN.search(decoded) or '\\' in decoded:
                    errors.append(f'{label}: forbidden filesystem path')
                    continue
                try:
                    url = urlsplit(value)
                except ValueError:
                    errors.append(f'{label}: invalid URL')
                    continue
                if url.scheme.lower() in EXTERNAL or url.netloc:
                    continue
                if url.scheme:
                    errors.append(f'{label}: unsupported scheme {url.scheme}')
                    continue
                path = unquote(url.path)
                if not path:
                    continue
                if '\x00' in path:
                    errors.append(f'{label}: invalid NUL in path')
                    continue
                if path.startswith('/'):
                    if not path.startswith(base_path):
                        errors.append(f'{label}: root URL outside project base {base_path}')
                        continue
                    target = root / path[len(base_path):]
                else:
                    target = self.source.parent / path
                target = target.resolve()
                if not target.is_relative_to(root):
                    errors.append(f'{label}: path escapes upload root')
                    continue
                if target.is_dir():
                    target = target / 'index.html'
                if not target.is_file():
                    errors.append(f'{label}: missing local target {path}')

        handle_startendtag = handle_starttag

    for source in sorted(root.rglob('*.html')):
        if any(p.startswith('.') for p in source.relative_to(root).parts):
            continue
        try:
            text = source.read_text(encoding='utf-8')
        except (OSError, UnicodeError) as exc:
            errors.append(f'{source}: cannot read UTF-8 HTML: {type(exc).__name__}')
            continue
        for match in FORBIDDEN.finditer(text):
            line = text.count('\n', 0, match.start()) + 1
            errors.append(f'{source}:{line}: forbidden filesystem path in HTML source')
        Parser(source).feed(text)
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root', nargs='?', default='.')
    parser.add_argument('--base-path', default='/Minamitane-life-demo/')
    args = parser.parse_args()
    try:
        errors = validate(args.root, args.base_path)
    except (OSError, ValueError) as exc:
        print(f'Pages validation ERROR: {exc}', file=sys.stderr)
        return 1
    if errors:
        for error in errors:
            print(f'Pages validation ERROR: {error}', file=sys.stderr)
        return 1
    print('Pages validation PASS')
    return 0


if __name__ == '__main__':
    sys.exit(main())
