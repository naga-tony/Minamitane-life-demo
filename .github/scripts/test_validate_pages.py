import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from validate_pages import validate


class PagesValidationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def html(self, text, path='index.html'):
        target = self.root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text, encoding='utf-8')

    def test_normal_references(self):
        self.html('<img src="assets/a%20b.png?v=1#x"><a href="sub/">x</a>'
                  '<link href="/Minamitane-life-demo/style.css">')
        self.html('<a href="../index.html">home</a>', 'sub/index.html')
        (self.root / 'assets').mkdir()
        (self.root / 'assets/a b.png').touch()
        (self.root / 'style.css').touch()
        self.assertEqual(validate(self.root), [])

    def test_external_inline_and_fragment(self):
        self.html(''.join(f'<a href="{v}">x</a>' for v in (
            'https://example.com/a', '//example.com/a', 'data:image/png;base64,AAAA',
            'blob:https://example.com/id', 'mailto:a@example.com', 'tel:123',
            'javascript:void(0)', '#main', '?x=1', '')))
        self.assertEqual(validate(self.root), [])

    def test_missing_or_empty_entry(self):
        self.assertTrue(validate(self.root))
        for text in ('', ' \n\t'):
            self.html(text)
            self.assertTrue(validate(self.root))

    def test_missing_references(self):
        for text in ('<img src="missing.png">', '<a href="missing.html">',
                     '<link href="style.css">', '<img src="wrong%20name.png">'):
            with self.subTest(text=text):
                self.html(text)
                self.assertTrue(validate(self.root))

    def test_filesystem_paths(self):
        for value in ('file:///Users/a/a.png', 'FILE://host/a', '/Users/a/a.png',
                      '/home/a/a.png', '/Volumes/a/a.png', '/tmp/a', '/workspace/a',
                      'C:\\Users\\a.png', 'D:/dev/a.png', '\\\\pc\\share\\a.png',
                      '~/a.png', '%66ile:///a', '/%55sers/a/a.png'):
            with self.subTest(value=value):
                self.html(f'<img src="{value}">')
                self.assertTrue(validate(self.root))

    def test_raw_css_js_paths(self):
        for text in ("<style>a{background:url(file:///tmp/a)}</style>",
                     "<script>const x='/Users/me/a.png';</script>"):
            self.html(text)
            self.assertTrue(validate(self.root))

    def test_escape_root_and_project_base(self):
        for value in ('../index.html', '%2e%2e/index.html', '/index.html', '/assets/a.png'):
            self.html(f'<a href="{value}">')
            self.assertTrue(validate(self.root))

    def test_directory_requires_index(self):
        (self.root / 'sub').mkdir()
        self.html('<a href="sub/">')
        self.assertTrue(validate(self.root))

    def test_base_and_invalid_url(self):
        for text in ('<base href="https://example.com/">', '<img src="http://[bad">',
                     '<img src="missing%00.png">', '<a href="custom:value">'):
            self.html(text)
            self.assertTrue(validate(self.root))

    def test_hidden_html_excluded(self):
        self.html('<h1>ok</h1>')
        self.html('<img src="missing">', '.github/fixture.html')
        self.assertEqual(validate(self.root), [])

    def test_invalid_encoding(self):
        (self.root / 'index.html').write_bytes(b'\xff')
        self.assertTrue(validate(self.root))

    def test_symlink_escape(self):
        self.html('<img src="outside">')
        (self.root / 'outside').symlink_to(self.root.parent)
        self.assertTrue(validate(self.root))

    def test_cli_exit_codes(self):
        script = Path(__file__).with_name('validate_pages.py')
        self.html('<h1>ok</h1>')
        good = subprocess.run([sys.executable, str(script), str(self.root)], capture_output=True)
        self.assertEqual(good.returncode, 0)
        self.html('<img src="missing.png">')
        bad = subprocess.run([sys.executable, str(script), str(self.root)], capture_output=True)
        self.assertEqual(bad.returncode, 1)
        self.assertIn(b'missing local target', bad.stderr)


if __name__ == '__main__':
    unittest.main()
