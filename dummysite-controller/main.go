package main

import (
	"context"
	"log"
	"os"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/util/intstr"
	"k8s.io/apimachinery/pkg/watch"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

var dummySiteGVR = schema.GroupVersionResource{
	Group:    "dwk.cirenandre.com",
	Version:  "v1",
	Resource: "dummysites",
}

func getConfig() *rest.Config {
	if cfg, err := rest.InClusterConfig(); err == nil {
		return cfg
	}

	kubeconfig := os.Getenv("KUBECONFIG")
	if kubeconfig == "" {
		kubeconfig = clientcmd.RecommendedHomeFile
	}
	cfg, err := clientcmd.BuildConfigFromFlags("", kubeconfig)
	if err != nil {
		log.Fatalf("failed to load kube config: %v", err)
	}
	return cfg
}

func deploymentName(siteName string) string {
	return "dummysite-" + siteName
}

func ownerReference(obj *unstructured.Unstructured) metav1.OwnerReference {
	controller := true
	blockOwnerDeletion := true
	return metav1.OwnerReference{
		APIVersion:         dummySiteGVR.GroupVersion().String(),
		Kind:               "DummySite",
		Name:               obj.GetName(),
		UID:                obj.GetUID(),
		Controller:         &controller,
		BlockOwnerDeletion: &blockOwnerDeletion,
	}
}

func createResourcesForSite(ctx context.Context, clientset kubernetes.Interface, namespace string, obj *unstructured.Unstructured, websiteURL string) {
	name := deploymentName(obj.GetName())
	owner := ownerReference(obj)
	labels := map[string]string{"app": name}

	replicas := int32(1)
	deployment := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:            name,
			Namespace:       namespace,
			Labels:          labels,
			OwnerReferences: []metav1.OwnerReference{owner},
		},
		Spec: appsv1.DeploymentSpec{
			Replicas: &replicas,
			Selector: &metav1.LabelSelector{MatchLabels: labels},
			Template: corev1.PodTemplateSpec{
				ObjectMeta: metav1.ObjectMeta{Labels: labels},
				Spec: corev1.PodSpec{
					InitContainers: []corev1.Container{
						{
							Name:  "fetch-site",
							Image: "curlimages/curl:8.10.1",
							Command: []string{"sh", "-c",
								`curl -sSL -A "Mozilla/5.0" -o /site/index.html "` + websiteURL + `" || echo "<html><body>Failed to fetch ` + websiteURL + `</body></html>" > /site/index.html`},
							VolumeMounts: []corev1.VolumeMount{{Name: "site", MountPath: "/site"}},
						},
					},
					Containers: []corev1.Container{
						{
							Name:         "nginx",
							Image:        "nginx:1.27-alpine",
							Ports:        []corev1.ContainerPort{{ContainerPort: 80}},
							VolumeMounts: []corev1.VolumeMount{{Name: "site", MountPath: "/usr/share/nginx/html"}},
						},
					},
					Volumes: []corev1.Volume{
						{Name: "site", VolumeSource: corev1.VolumeSource{EmptyDir: &corev1.EmptyDirVolumeSource{}}},
					},
				},
			},
		},
	}

	if _, err := clientset.AppsV1().Deployments(namespace).Create(ctx, deployment, metav1.CreateOptions{}); err != nil {
		if apierrors.IsAlreadyExists(err) {
			log.Printf("deployment %s already exists", name)
		} else {
			log.Printf("failed to create deployment %s: %v", name, err)
		}
	} else {
		log.Printf("created deployment %s", name)
	}

	service := &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{
			Name:            name,
			Namespace:       namespace,
			OwnerReferences: []metav1.OwnerReference{owner},
		},
		Spec: corev1.ServiceSpec{
			Selector: labels,
			Ports:    []corev1.ServicePort{{Port: 80, TargetPort: intstr.FromInt32(80)}},
			Type:     corev1.ServiceTypeNodePort,
		},
	}

	if _, err := clientset.CoreV1().Services(namespace).Create(ctx, service, metav1.CreateOptions{}); err != nil {
		if apierrors.IsAlreadyExists(err) {
			log.Printf("service %s already exists", name)
		} else {
			log.Printf("failed to create service %s: %v", name, err)
		}
	} else {
		log.Printf("created service %s", name)
	}
}

func watchDummySites(ctx context.Context, dynamicClient dynamic.Interface, clientset kubernetes.Interface, namespace string) {
	for {
		w, err := dynamicClient.Resource(dummySiteGVR).Namespace(namespace).Watch(ctx, metav1.ListOptions{})
		if err != nil {
			log.Printf("failed to start watch: %v, retrying in 5s", err)
			time.Sleep(5 * time.Second)
			continue
		}

		log.Printf("watching DummySite resources in namespace %s", namespace)
		for event := range w.ResultChan() {
			if event.Type != watch.Added {
				continue
			}

			obj, ok := event.Object.(*unstructured.Unstructured)
			if !ok {
				continue
			}

			websiteURL, found, err := unstructured.NestedString(obj.Object, "spec", "website_url")
			if err != nil || !found || websiteURL == "" {
				log.Printf("DummySite %s has no website_url, skipping", obj.GetName())
				continue
			}

			log.Printf("DummySite %s added, website_url=%s", obj.GetName(), websiteURL)
			createResourcesForSite(ctx, clientset, namespace, obj, websiteURL)
		}

		log.Printf("watch closed, restarting in 5s")
		time.Sleep(5 * time.Second)
	}
}

func main() {
	namespace := os.Getenv("NAMESPACE")
	if namespace == "" {
		namespace = "dummysite"
	}

	cfg := getConfig()

	dynamicClient, err := dynamic.NewForConfig(cfg)
	if err != nil {
		log.Fatalf("failed to create dynamic client: %v", err)
	}

	clientset, err := kubernetes.NewForConfig(cfg)
	if err != nil {
		log.Fatalf("failed to create clientset: %v", err)
	}

	log.Printf("DummySite controller starting, namespace=%s", namespace)
	watchDummySites(context.Background(), dynamicClient, clientset, namespace)
}
