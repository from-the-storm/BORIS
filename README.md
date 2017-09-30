BORIS Web App
=============

This is a web application designed to deliver apocalypse-preparation training
activities to participants.


Running a local development environment
---------------------------------------

1. Make sure you have
[Vagrant](https://www.vagrantup.com/) and
[VirtualBox](https://www.virtualbox.org/) installed on your computer.
2. Add this line to `/etc/hosts`:

    ```
    192.168.168.17  boris.local
    ```
3. From this directory, simply run `vagrant up`
4. You can now access the app at https://boris.local/
   * You may get an HTTPS/SSL warning, which is safe to ignore. You can
     tell your computer to trust the `boxes/roles/app/templates/boris-self.crt`
     certificate to avoid the warning.
   * If it works, you should see the message "This is the BORIS server."
6. To restart the app server after making a change:

    ```
    vagrant ssh
    ubuntu@boris-devbox:~$ sudo su boris 
    (.venv-boris) [boris@boris-devbox ~]$ touch ~/uwsgi/config
    ```

7. To access the django shell:
```
vagrant ssh
ubuntu@boris-devbox:~$ sudo su boris 
(.venv-boris) [boris@boris-devbox ~]$ cd boris/backend/
(.venv-boris) [boris@boris-devbox boris]$ ./manage.py shell
```
8. To create a superuser to access the admin UI: Follow the same steps as above
   for the django shell, but instead of `manage.py shell`, run
   `manage.py createsuperuser`
9. To shut down the dev server VM:
```
vagrant halt
```
