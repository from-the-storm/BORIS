#
# boris devbox
#
# Add to /etc/hosts:
# 192.168.168.17  boris.local


# Vagrantfile API/syntax version. Don't touch unless you know what you're doing!
VAGRANTFILE_API_VERSION = "2"

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|
  config.vm.box = "ubuntu/xenial64"

  # Create a private network, which allows host-only access to the machine
  # using a specific IP.
  config.vm.network "private_network", ip: "192.168.168.17"

  # If true, then any SSH connections made will enable agent forwarding.
  # Default value: false
  # config.ssh.forward_agent = true

  # Synced folders
  config.vm.synced_folder  ".", "/vagrant", disabled: true
  config.vm.synced_folder ".", "/home/boris/boris", nfs: true
  
  # Virtualbox config:
  config.vm.provider "virtualbox" do |vb|
    vb.name = "boris_devbox"
    vb.memory = 1536
  end

  # Ansible Playbook
  config.vm.provision :ansible do |ansible|
    ansible.playbook = "boxes/playbook-devbox.yml"
  end

  # Start boris app after synced folders are mounted
  #config.vm.provision :shell, :inline => "sudo service uwsgi start", run: "always"

end
