BORIS Web App
=============

This is a web application designed to deliver apocalypse-preparation training
activities to participants.


Running a local development environment
---------------------------------------

**Setup**

1. Make sure you have
[Vagrant](https://www.vagrantup.com/) and
[VirtualBox](https://www.virtualbox.org/) installed on your computer.
2. Add this line to `/etc/hosts`:

    ```
    192.168.168.17  boris.local
    ```

** Running BORIS**

1. From this directory, run `vagrant up && vagrant ssh`
2. When you see `ubuntu@boris-devbox:~$`, enter `sudo su boris`
3. As the `boris` user, run `~/boris/backend/manage.py runserver 8432` to start
   the django backend server.
4. You can now access the app at https://boris.local/
   * You may get an HTTPS/SSL warning, which is safe to ignore. You can
     tell your computer to trust the `boxes/roles/app/templates/boris-self.crt`
     certificate to avoid the warning.

**To access the django shell:**

```
vagrant up && vagrant ssh
ubuntu@boris-devbox:~$ sudo su boris 
(.venv-boris) [boris@boris-devbox boris]$ ~/boris/backend/manage.py shell
```

**To create a superuser** to access the admin UI: Follow the same steps as above
   for the django shell, but instead of `manage.py shell`, run
   `manage.py createsuperuser`

**To shut down the dev server VM:**

Run this command from your host computer:
```
vagrant halt
```

**To build the frontend:**

From your host computer:

```
cd frontend
npm install
npm run build
```

Once you've installed the required packages, you can rebuild the frontend
anytime with `npm run build` only.
