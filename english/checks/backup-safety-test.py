import fcntl,os,signal,subprocess,sys,tempfile,unittest
from unittest.mock import patch

SCRIPT_PATH='/root/.openclaw/workspace-nim/toolkit/english/checks/backup-data.py'

class BackupSafetyTests(unittest.TestCase):
    def setUp(self):
        self.tmpdir=tempfile.TemporaryDirectory()
        self.env={'VOCAB_BACKUP_DIR': self.tmpdir.name, 'VOCAB_BACKUP_LOCK': os.path.join(self.tmpdir.name, 'test.lock')}

    def tearDown(self):
        self.tmpdir.cleanup()

    def test_all_restarts_attempted_on_failure(self):
        fake_inspect=lambda cmd: b'[{"State":{"Running":true}}]'
        starts=[]

        def fake_run(cmd,**kwargs):
            if cmd[:2]==['docker','start']:
                starts.append(cmd[2])
                if cmd[2]=='vocab-learner':
                    return subprocess.CompletedProcess(cmd,returncode=1)
                return subprocess.CompletedProcess(cmd,returncode=0)
            if cmd[:2]==['docker','stop']:
                return subprocess.CompletedProcess(cmd,returncode=0)
            return subprocess.CompletedProcess(cmd,returncode=0)

        with patch.dict(os.environ, self.env), \
             patch('subprocess.check_output',side_effect=fake_inspect), \
             patch('subprocess.run',side_effect=fake_run), \
             patch('os.path.exists',return_value=False), \
             patch('sys.stderr.write'), \
             patch('sys.stdout.write') as mock_out:
            
            with open(SCRIPT_PATH) as f:
                code=f.read()
            with self.assertRaises(SystemExit) as cm:
                exec(compile(code, SCRIPT_PATH, 'exec'), {'__name__': '__main__'})
            
            self.assertEqual(starts,['vocab-learner','english-spotify-worker'])
            self.assertEqual(cm.exception.code,2)
            mock_out_calls=''.join(c.args[0] for c in mock_out.call_args_list if c.args)
            self.assertNotIn('BACKUP_OK',mock_out_calls)

    def test_missing_database_fails_before_backup(self):
        fake_inspect=lambda cmd: b'[{"State":{"Running":false}}]'
        with patch.dict(os.environ, self.env), \
             patch('subprocess.check_output',side_effect=fake_inspect), \
             patch('os.path.exists',return_value=False), \
             patch('sys.stdout.write') as mock_out, \
             patch('sys.stderr.write'):
            with open(SCRIPT_PATH) as f:
                code=f.read()
            with self.assertRaises(FileNotFoundError):
                exec(compile(code, SCRIPT_PATH, 'exec'), {'__name__': '__main__'})
            mock_out_calls=''.join(c.args[0] for c in mock_out.call_args_list if c.args)
            self.assertNotIn('BACKUP_OK',mock_out_calls)

    def test_internal_lock_serialization(self):
        lock_file=self.env['VOCAB_BACKUP_LOCK']
        lock_fd=os.open(lock_file,os.O_RDWR|os.O_CREAT,0o600)
        try:
            fcntl.flock(lock_fd,fcntl.LOCK_EX|fcntl.LOCK_NB)
            res=subprocess.run([sys.executable,SCRIPT_PATH],env={**os.environ,**self.env},capture_output=True,text=True)
            self.assertEqual(res.returncode,1)
            self.assertIn('Backup already running',res.stderr)
        finally:
            fcntl.flock(lock_fd,fcntl.LOCK_UN)
            os.close(lock_fd)

    def test_sigterm_triggers_restart_cleanup(self):
        fake_inspect=lambda cmd: b'[{"State":{"Running":true}}]'
        starts=[]
        def fake_run(cmd,**kwargs):
            if cmd[:2]==['docker','start']:
                starts.append(cmd[2])
                return subprocess.CompletedProcess(cmd,returncode=0)
            if cmd[:2]==['docker','stop']:
                return subprocess.CompletedProcess(cmd,returncode=0)
            return subprocess.CompletedProcess(cmd,returncode=0)

        # Trigger SIGTERM only when checking the sqlite database file
        orig_exists=os.path.exists
        def fake_exists(p):
            if str(p).endswith('.sqlite'):
                handler=signal.getsignal(signal.SIGTERM)
                handler(signal.SIGTERM, None)
            return orig_exists(p)

        with patch.dict(os.environ, self.env), \
             patch('subprocess.check_output',side_effect=fake_inspect), \
             patch('subprocess.run',side_effect=fake_run), \
             patch('os.path.exists',side_effect=fake_exists), \
             patch('sys.stderr.write'):
            with open(SCRIPT_PATH) as f:
                code=f.read()
            with self.assertRaises(SystemExit) as cm:
                exec(compile(code, SCRIPT_PATH, 'exec'), {'__name__': '__main__'})
            self.assertEqual(cm.exception.code,128+signal.SIGTERM)
            self.assertEqual(starts,['vocab-learner','english-spotify-worker'])

if __name__=='__main__':
    unittest.main()
